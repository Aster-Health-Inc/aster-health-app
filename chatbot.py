import streamlit as st
import pickle
import pandas as pd
import os
from dotenv import load_dotenv
from datetime import datetime

from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import FAISS
from langchain.embeddings import OpenAIEmbeddings
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain.chat_models import ChatOpenAI

load_dotenv()

@st.cache_resource
def load_model():
    return pickle.load(open("cycle-prediction/models/random_forest_cycle_predictor.pkl", "rb"))

model = load_model()

def load_documents_from_directory(directory):
    docs = []
    for file in os.listdir(directory):
        file_path = os.path.join(directory, file)
        if file.endswith(".pdf"):
            loader = PyPDFLoader(file_path)
        elif file.endswith(".txt"):
            loader = TextLoader(file_path)
        else:
            continue
        docs.extend(loader.load())
    return docs

@st.cache_resource(show_spinner=True)
def create_qa_chain():
    documents = load_documents_from_directory(
        "/Users/adwaitmahajan/Desktop/Aster Health/aster-health-app/mood-prediction/context_documents"
    )
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = splitter.split_documents(documents)

    embeddings = OpenAIEmbeddings()
    vector_store = FAISS.from_documents(chunks, embeddings)

    prompt_template = """
You are a compassionate assistant trained on menstrual and hormonal health documents.

{question}

Use ONLY the context below to answer their question.
If the answer is not in the context, reply with:
"I'm not sure based on the available context."

Context:
{context}

Helpful Answer:
"""

    prompt = PromptTemplate(
        input_variables=["context", "question"],
        template=prompt_template,
    )

    llm = ChatOpenAI(model='gpt-3.5-turbo', temperature=0.6)

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=vector_store.as_retriever(),
        chain_type="stuff",
        chain_type_kwargs={"prompt": prompt},
        return_source_documents=False
    )

    return qa_chain

def determine_phase(today, start_date, cycle_length):
    days_since = (today - start_date).days
    if days_since < 0:
        return "pre-cycle"
    if days_since <= 5:
        return "menstrual"
    elif days_since <= 13:
        return "follicular"
    elif days_since <= 16:
        return "ovulation"
    elif days_since <= cycle_length:
        return "luteal"
    else:
        return "post-cycle or irregular"

qa_chain = create_qa_chain()

st.set_page_config(page_title="Cycle Chatbot", page_icon="🩸")
st.title("🩸 Menstrual Health Chatbot")

if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

if "predicted_length" not in st.session_state:
    st.session_state.predicted_length = None

if "start_date" not in st.session_state:
    st.session_state.start_date = None

# Display chat history
for msg in st.session_state.chat_history:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# User chat input for LLM questions
user_input = st.chat_input("Ask me anything about your cycle, mood, or health...")

### User Inputs Form
with st.form("user_inputs_form"):
    st.subheader("📅 Provide your menstrual health info:")

    col1, col2 = st.columns(2)
    with col1:
        start_date = st.date_input("Start Date of Last Period")
    with col2:
        end_date = st.date_input("End Date of Last Period")

    st.session_state.start_date = start_date
    length_of_cycle = (end_date - start_date).days if end_date > start_date else 28
    st.write(f"🧶 Calculated Length of Cycle: `{length_of_cycle}` days")

    length_of_menses = st.slider("Length of Menses (Days)", 1, 10, 4)

    menses_day1 = st.slider("Menses Score Day 1", 1, 3, 3)
    menses_day2 = st.slider("Menses Score Day 2", 1, 3, 3)
    menses_day3 = st.slider("Menses Score Day 3", 1, 3, 2)
    menses_day4 = st.slider("Menses Score Day 4", 1, 3, 1)

    estimated_ovulation = st.slider("Estimated Day of Ovulation", 10, 20, 14)
    unusual_bleeding = st.checkbox("Unusual Bleeding?", value=False)
    intercourse_in_window = st.checkbox("Intercourse in Fertile Window?", value=False)

    submitted = st.form_submit_button("Predict Cycle Length")

# Handle form submit: prediction only
if submitted:
    total_menses_score = menses_day1 + menses_day2 + menses_day3 + menses_day4
    luteal_phase = length_of_cycle - estimated_ovulation
    ovulation_day = length_of_cycle - luteal_phase
    first_day_of_high = ovulation_day - 5
    total_high_days = 5
    total_peak_days = 2
    total_days_fertility = total_high_days + total_peak_days
    cycle_with_peak = 1.0 if estimated_ovulation and length_of_cycle else 0.0

    input_features = pd.DataFrame([[
        cycle_with_peak,
        estimated_ovulation,
        luteal_phase,
        first_day_of_high,
        total_high_days,
        total_peak_days,
        total_days_fertility,
        length_of_menses,
        menses_day1,
        menses_day2,
        menses_day3,
        menses_day4,
        total_menses_score,
        int(intercourse_in_window),
        int(unusual_bleeding)
    ]], columns=[
        'CycleWithPeakorNot', 'EstimatedDayofOvulation', 'LengthofLutealPhase',
        'FirstDayofHigh', 'TotalNumberofHighDays', 'TotalNumberofPeakDays',
        'TotalDaysofFertility', 'LengthofMenses', 'MensesScoreDayOne',
        'MensesScoreDayTwo', 'MensesScoreDayThree', 'MensesScoreDayFour',
        'TotalMensesScore', 'IntercourseInFertileWindow', 'UnusualBleeding'
    ])

    predicted_length = model.predict(input_features)[0]
    st.session_state.predicted_length = predicted_length

    st.chat_message("assistant").markdown(f"🗓️ **Predicted Cycle Length:** `{predicted_length:.1f}` days")
    st.session_state.chat_history.append({"role": "user", "content": "Submitted menstrual health data."})
    st.session_state.chat_history.append({
        "role": "assistant",
        "content": f"🗓️ Based on your inputs, your predicted cycle length is **{predicted_length:.1f} days**."
    })

# Handle user chat input — LLM answers here
if user_input:
    st.chat_message("user").markdown(user_input)
    st.session_state.chat_history.append({"role": "user", "content": user_input})

    today = datetime.today().date()
    if st.session_state.predicted_length is not None and st.session_state.start_date:
        current_phase = determine_phase(today, st.session_state.start_date, st.session_state.predicted_length)
    else:
        current_phase = "unknown"

    try:
        if current_phase != "unknown":
            query = f"The user is currently in the {current_phase} phase. {user_input}"
        else:
            query = user_input

        response = qa_chain.run(query)
        st.chat_message("assistant").markdown(response)
        st.session_state.chat_history.append({"role": "assistant", "content": response})
    except Exception as e:
        err_msg = "⚠️ Sorry, I ran into an error while answering that."
        st.chat_message("assistant").markdown(err_msg)
        st.session_state.chat_history.append({"role": "assistant", "content": err_msg})
        st.error(e)
