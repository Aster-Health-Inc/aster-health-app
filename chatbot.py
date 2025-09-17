import streamlit as st

# Must be the very first Streamlit command
st.set_page_config(page_title="Cycle Chatbot", page_icon="🩸")

import pickle
import pandas as pd
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
import uuid, csv
from pathlib import Path
from rapidfuzz import fuzz  # <- for fuzzy matching
import tempfile
import requests
from supabase import create_client, Client

from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

# ------------------------------
# Logging setup
# ------------------------------
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / "interactions.csv"
AGG_FILE = LOG_DIR / "daily_metrics.csv"
FALLBACK_PHRASE = "I'm not sure based on the available context."

# CSV for evaluation dataset
if "eval_dataset" not in st.session_state:
    st.session_state.eval_dataset = None

load_dotenv()

# Initialize Supabase client
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_ANON_KEY")

# Only initialize Supabase if credentials are available
supabase = None
if url and key:
    try:
        supabase: Client = create_client(url, key)
    except Exception as e:
        st.error(f"Failed to initialize Supabase client: {e}")
else:
    if not url:
        st.error("SUPABASE_URL environment variable is required")
    if not key:
        st.error("SUPABASE_ANON_KEY environment variable is required")

def download_file_from_supabase(bucket_name: str, file_path: str):
    """Download a file from Supabase storage bucket"""
    if not supabase:
        st.error("Supabase client not initialized")
        return None
    try:
        response = supabase.storage.from_(bucket_name).download(file_path)
        return response
    except Exception as e:
        st.error(f"Error downloading file {file_path} from bucket {bucket_name}: {e}")
        return None

def download_text_file(bucket_name: str, file_path: str):
    """Download and read text file content from Supabase storage"""
    try:
        file_data = download_file_from_supabase(bucket_name, file_path)
        if file_data:
            return file_data.decode('utf-8')
        return None
    except Exception as e:
        st.error(f"Error reading text file {file_path}: {e}")
        return None

def list_files_in_bucket(bucket_name: str, folder_path: str = ''):
    """List all files in a storage bucket folder"""
    if not supabase:
        st.error("Supabase client not initialized")
        return []
    try:
        response = supabase.storage.from_(bucket_name).list(folder_path)
        return response
    except Exception as e:
        st.error(f"Error listing files in bucket {bucket_name}/{folder_path}: {e}")
        return []

@st.cache_resource
def load_model():
    """Download and load model from Supabase using direct HTTP URL"""
    model_url = "https://iinbwdrzmmcwajbmuynh.supabase.co/storage/v1/object/public/chatbot-assets/models/random_forest_cycle_predictor.pkl"

    try:
        response = requests.get(model_url)
        if response.status_code == 200:
            # Create a temporary file for the model
            temp_file = tempfile.NamedTemporaryFile(suffix='.pkl', delete=False)
            temp_file.write(response.content)
            temp_file.close()

            # Load the model from the temporary file
            with open(temp_file.name, 'rb') as f:
                model = pickle.load(f)

            # Clean up the temporary file
            os.unlink(temp_file.name)

            # Model loaded successfully
            return model
        else:
            st.warning(f"⚠️ Model not found in Supabase (HTTP {response.status_code}). Cycle prediction will be disabled.")
            return None
    except Exception as e:
        st.warning(f"⚠️ Error loading model from Supabase: {e}. Cycle prediction will be disabled.")
        return None

model = load_model()

def load_documents_from_supabase():
    """Download context documents from Supabase using direct HTTP URLs"""
    docs = []
    temp_files = []

    # Direct URLs for known files
    base_url = "https://iinbwdrzmmcwajbmuynh.supabase.co/storage/v1/object/public/chatbot-assets"

    files_to_download = [
        ('context_documents/mood_and_hormones.txt', 'txt'),
        ('context_documents/physical_effects.txt', 'txt'),
        ('context_documents/Mood_Swing_during_Menstruation.pdf', 'pdf'),
        ('context_documents/Psychiatric_Symptoms_Across_the_Menstrual_Cycle_in_Adult_Women.pdf', 'pdf'),
        ('context_documents/window_of_vulnerability.pdf', 'pdf')
    ]

    try:
        for file_path, file_type in files_to_download:
            url = f"{base_url}/{file_path}"

            try:
                response = requests.get(url)
                if response.status_code == 200:
                    if file_type == 'txt':
                        # Create temporary text file
                        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8')
                        temp_file.write(response.text)
                        temp_file.close()
                        temp_files.append(temp_file.name)

                        loader = TextLoader(temp_file.name)
                        docs.extend(loader.load())

                    elif file_type == 'pdf':
                        # Create temporary PDF file
                        temp_file = tempfile.NamedTemporaryFile(suffix='.pdf', delete=False)
                        temp_file.write(response.content)
                        temp_file.close()
                        temp_files.append(temp_file.name)

                        loader = PyPDFLoader(temp_file.name)
                        docs.extend(loader.load())

                    # Downloaded successfully
                else:
                    st.warning(f"⚠️ Could not download {file_path} (HTTP {response.status_code})")

            except Exception as e:
                st.warning(f"⚠️ Error downloading {file_path}: {e}")
                continue

        # Clean up temporary files
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
            except Exception as e:
                st.warning(f"Error cleaning up temp file {temp_file}: {e}")

        return docs

    except Exception as e:
        st.error(f"Error loading documents from Supabase: {e}")
        return []

@st.cache_resource(show_spinner=True)
def create_qa_chain():
    documents = load_documents_from_supabase()

    if not documents:
        st.error("❌ No documents loaded from Supabase")
        return create_fallback_qa_chain()

    st.success(f"✅ Loaded {len(documents)} documents from Supabase")

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = splitter.split_documents(documents)

    if not chunks:
        st.error("❌ No text chunks created from documents.")
        return None

    st.success(f"✅ Created {len(chunks)} text chunks")

    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    vector_store = FAISS.from_documents(chunks, embeddings)

    st.success("✅ Vector store created successfully")

    prompt_template = """
You are a compassionate assistant specializing in menstrual and hormonal health.

Question: {question}

Relevant Context:
{context}

Based on the context provided and your knowledge of menstrual health, provide a helpful, empathetic response. If you need more specific information, suggest consulting a healthcare provider.

Helpful Answer:
"""

    prompt = PromptTemplate(
        input_variables=["context", "question"],
        template=prompt_template,
    )

    llm = ChatOpenAI(model='gpt-4o-mini', temperature=0.6)

    retriever = vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 6}  # Retrieve more context
    )

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=retriever,
        chain_type="stuff",
        chain_type_kwargs={"prompt": prompt},
        return_source_documents=True  # Enable for debugging
    )

    return qa_chain

def create_fallback_qa_chain():
    """Create a basic QA chain without vector store for fallback mode"""
    prompt_template = """
You are a compassionate assistant trained on menstrual and hormonal health.

{question}

Based on general knowledge about menstrual health, provide a helpful response.
If you're not certain about medical advice, recommend consulting a healthcare provider.

Helpful Answer:
"""

    prompt = PromptTemplate(
        input_variables=["question"],
        template=prompt_template,
    )

    llm = ChatOpenAI(model='gpt-4o-mini', temperature=0.6)

    # Simple chain without retrieval
    from langchain.chains import LLMChain
    return LLMChain(llm=llm, prompt=prompt)

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

# ------------------------------
# Logging functions
# ------------------------------
if "session_id" not in st.session_state:
    st.session_state.session_id = str(uuid.uuid4())

def _ensure_log_header():
    if not LOG_FILE.exists():
        with open(LOG_FILE, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "timestamp_iso",
                "session_id",
                "event_type",        # "chat" or "conversion" or "eval"
                "user_input",
                "assistant_response",
                "expected_answer",
                "phase",
                "predicted_length",
                "is_fallback",       # 0/1
                "is_match"           # 0/1
            ])

def log_interaction(event_type, user_input, assistant_response, expected_answer, phase, predicted_length, is_fallback, is_match):
    _ensure_log_header()
    with open(LOG_FILE, "a", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            datetime.now().isoformat(),
            st.session_state.session_id,
            event_type,
            user_input or "",
            assistant_response or "",
            expected_answer or "",
            phase or "",
            f"{predicted_length:.2f}" if isinstance(predicted_length, (int, float)) else "",
            int(bool(is_fallback)),
            int(bool(is_match))
        ])

def write_daily_aggregates():
    if not LOG_FILE.exists():
        return
    df = pd.read_csv(LOG_FILE)
    if df.empty:
        return
    df["date"] = pd.to_datetime(df["timestamp_iso"]).dt.date
    g = df.groupby("date").agg(
        total_interactions=("event_type", "count"),
        fallbacks=("is_fallback", "sum"),
        matches=("is_match", "sum"),
        conversions=("event_type", lambda s: (s=="conversion").sum())
    ).reset_index()
    g["fallback_rate"] = (g["fallbacks"] / g["total_interactions"]).round(3)
    g["accuracy"] = (g["matches"] / g["total_interactions"]).round(3)
    g["conversion_rate"] = (g["conversions"] / g["total_interactions"]).round(3)
    g.to_csv(AGG_FILE, index=False)

# ------------------------------
# Streamlit UI
# ------------------------------
qa_chain = create_qa_chain()
if not qa_chain:
    st.error("Failed to initialize QA chain. Please check your Supabase storage setup.")
    st.stop()
st.title("🩸 Menstrual Health Chatbot")

# Add cache clear button in sidebar
with st.sidebar:
    if st.button("🔄 Clear Cache & Reload"):
        st.cache_resource.clear()
        st.rerun()

# Upload evaluation dataset
st.sidebar.subheader("📂 Upload Evaluation Dataset")
eval_file = st.sidebar.file_uploader("Upload CSV with columns: question,expected_answer", type=["csv"])
if eval_file:
    st.session_state.eval_dataset = pd.read_csv(eval_file)
    st.sidebar.success("Evaluation dataset loaded ✅")
    st.sidebar.write(st.session_state.eval_dataset.head())

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

# ------------------------------
# Chat input
# ------------------------------
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

# Handle form submit
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

    if model is not None:
        predicted_length = model.predict(input_features)[0]
    else:
        st.error("⚠️ Cycle prediction model not available. Please upload the model to Supabase.")
        predicted_length = length_of_cycle  # Use calculated cycle length as fallback
    st.session_state.predicted_length = predicted_length

    st.chat_message("assistant").markdown(f"🗓️ **Predicted Cycle Length:** `{predicted_length:.1f}` days")
    st.session_state.chat_history.append({"role": "assistant", "content": f"🗓️ Based on your inputs, your predicted cycle length is **{predicted_length:.1f} days**."})

    log_interaction("conversion", "Submitted menstrual health data", f"Predicted {predicted_length:.1f} days", "", "", predicted_length, False, False)
    write_daily_aggregates()

# Handle user chat input
if user_input:
    st.chat_message("user").markdown(user_input)
    st.session_state.chat_history.append({"role": "user", "content": user_input})

    today = datetime.today().date()
    if st.session_state.predicted_length is not None and st.session_state.start_date:
        current_phase = determine_phase(today, st.session_state.start_date, st.session_state.predicted_length)
        next_period_date = st.session_state.start_date + timedelta(days=int(st.session_state.predicted_length))
    else:
        current_phase = "unknown"
        next_period_date = None

    try:
        # Prepare query for LLM
        query = user_input
        if current_phase != "unknown":
            query = f"The user is currently in the {current_phase} phase. {user_input}"

        # If the question is about next period date, add ML prediction as context
        if "next period" in user_input.lower() and next_period_date:
            query += f" Also, the user's next period is expected on {next_period_date.strftime('%B %d, %Y')}."

        # RetrievalQA chains typically use "query" as the input key
        try:
            result = qa_chain.invoke({"query": query})
            response = result.get("result", result.get("answer", str(result)))

            # Debug: show sources if available
            if "source_documents" in result and result["source_documents"]:
                st.write(f"📚 Found {len(result['source_documents'])} relevant sources")
        except Exception as e:
            st.error(f"Error processing query: {str(e)}")
            response = "I'm sorry, I'm having trouble processing your question right now. Please try rephrasing it."
        
        # Always append next period date explicitly if relevant
        if "next period" in user_input.lower() and next_period_date:
            response += f"\n\n🗓️ Based on your predicted cycle length, your next period is expected on {next_period_date.strftime('%B %d, %Y')}."

        st.chat_message("assistant").markdown(response)
        st.session_state.chat_history.append({"role": "assistant", "content": response})

        # ---- Logging with evaluation dataset if available ----
        expected_answer = ""
        is_match = False
        if st.session_state.eval_dataset is not None:
            row = st.session_state.eval_dataset.loc[st.session_state.eval_dataset["question"] == user_input]
            if not row.empty:
                expected_answer = row["expected_answer"].values[0]
                score = fuzz.token_set_ratio(response, expected_answer)
                # Also consider phase/mood keywords for match
                keywords = ["menstrual", "follicular", "ovulation", "luteal", "mood", "energy"]
                if score > 75 or any(k in response.lower() for k in keywords):
                    is_match = True

        is_fallback = (FALLBACK_PHRASE in response)
        log_interaction("chat", user_input, response, expected_answer, current_phase, st.session_state.predicted_length, is_fallback, is_match)
        write_daily_aggregates()

    except Exception as e:
        err_msg = "⚠️ Sorry, I ran into an error while answering that."
        st.chat_message("assistant").markdown(err_msg)
        st.session_state.chat_history.append({"role": "assistant", "content": err_msg})
        st.error(e)

# ------------------------------
# Show metrics summary
# ------------------------------
st.sidebar.subheader("📊 Metrics Summary")
if AGG_FILE.exists():
    agg_df = pd.read_csv(AGG_FILE)
    st.sidebar.dataframe(agg_df.tail(7))
