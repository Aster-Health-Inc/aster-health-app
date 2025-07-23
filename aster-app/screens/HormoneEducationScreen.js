import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';

const HormoneEducationScreen = ({ navigation }) => {
  const [expandedHormone, setExpandedHormone] = useState(null);

  const hormones = [
    {
      id: 'estrogen',
      name: 'Estrogen',
      emoji: '🌸',
      color: '#e91e63',
      shortDescription: 'The confidence hormone that makes you glow',
      description: 'Estrogen is your main female hormone that rises and falls throughout your cycle. When it\'s high, you feel confident, social, and energetic.',
      phases: {
        menstrual: 'Low - Starting to rise from rock bottom',
        follicular: 'Rising - Building up your inner glow',
        ovulation: 'Peak - You\'re absolutely radiant',
        luteal: 'Declining - Coming down from the high'
      },
      effects: [
        'Boosts mood and confidence',
        'Increases energy levels',
        'Enhances skin glow',
        'Improves memory and focus',
        'Promotes bone health'
      ],
      funFact: 'Estrogen literally makes your skin produce more collagen, which is why you might notice you look extra glowy during ovulation!'
    },
    {
      id: 'progesterone',
      name: 'Progesterone',
      emoji: '🧘‍♀️',
      color: '#9c27b0',
      shortDescription: 'The calm-down hormone that helps you chill',
      description: 'Progesterone is like your body\'s natural chill pill. It helps you relax but can also make you feel a bit sluggish.',
      phases: {
        menstrual: 'Low - Almost non-existent',
        follicular: 'Low - Barely there',
        ovulation: 'Starting to rise - Beginning its climb',
        luteal: 'High then dropping - Peaks then crashes before your period'
      },
      effects: [
        'Promotes relaxation and sleep',
        'Can cause bloating',
        'May increase appetite',
        'Supports pregnancy preparation',
        'Can affect mood when dropping'
      ],
      funFact: 'Progesterone is made from the same building blocks as cortisol (stress hormone), which is why stress can mess with your cycle!'
    },
    {
      id: 'testosterone',
      name: 'Testosterone',
      emoji: '💪',
      color: '#ff9800',
      shortDescription: 'Your inner warrior hormone for strength and drive',
      description: 'Yes, you have testosterone too! It gives you motivation, strength, and that "let\'s get stuff done" energy.',
      phases: {
        menstrual: 'Low - Taking a break',
        follicular: 'Rising - Building up steam',
        ovulation: 'Peak - You feel unstoppable',
        luteal: 'Declining - Winding down'
      },
      effects: [
        'Increases motivation and drive',
        'Boosts muscle strength',
        'Enhances libido',
        'Improves competitive spirit',
        'Supports bone density'
      ],
      funFact: 'Around ovulation, your testosterone peaks, which is why you might feel extra motivated to hit the gym or tackle big projects!'
    },
    {
      id: 'fsh',
      name: 'FSH (Follicle Stimulating Hormone)',
      emoji: '🥚',
      color: '#4caf50',
      shortDescription: 'The egg whisperer that starts your cycle',
      description: 'FSH is like your cycle\'s director, telling your ovaries "action!" to start developing eggs each month.',
      phases: {
        menstrual: 'Rising - Getting ready to start the show',
        follicular: 'High - Working hard to mature an egg',
        ovulation: 'Dropping - Mission accomplished',
        luteal: 'Low - Taking a well-deserved break'
      },
      effects: [
        'Stimulates egg development',
        'Triggers estrogen production',
        'Regulates cycle timing',
        'Affects fertility',
        'Works with LH for ovulation'
      ],
      funFact: 'FSH levels can tell you a lot about your fertility and how close you might be to menopause - it\'s like your ovaries\' report card!'
    },
    {
      id: 'lh',
      name: 'LH (Luteinizing Hormone)',
      emoji: '🎯',
      color: '#2196f3',
      shortDescription: 'The trigger hormone that releases your egg',
      description: 'LH is the hormone that creates the dramatic "surge" right before ovulation, telling your egg "it\'s showtime!"',
      phases: {
        menstrual: 'Low - Waiting in the wings',
        follicular: 'Low - Building up for the big moment',
        ovulation: 'SURGE! - The main event happening now',
        luteal: 'Low - Show\'s over, time to rest'
      },
      effects: [
        'Triggers ovulation',
        'Causes egg release',
        'Can be detected by ovulation tests',
        'Creates fertility window',
        'Affects cycle timing'
      ],
      funFact: 'The LH surge is so reliable that home ovulation tests measure it to predict when you\'re about to ovulate - it\'s like your body\'s countdown timer!'
    }
  ];

  const toggleExpand = (hormoneId) => {
    setExpandedHormone(expandedHormone === hormoneId ? null : hormoneId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hormone Guide</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          Your body is a symphony of hormones playing together. Here's what each one does:
        </Text>

        {hormones.map((hormone) => (
          <TouchableOpacity
            key={hormone.id}
            style={[styles.hormoneCard, { borderLeftColor: hormone.color }]}
            onPress={() => toggleExpand(hormone.id)}
          >
            <View style={styles.hormoneHeader}>
              <Text style={styles.hormoneEmoji}>{hormone.emoji}</Text>
              <View style={styles.hormoneInfo}>
                <Text style={styles.hormoneName}>{hormone.name}</Text>
                <Text style={styles.hormoneShortDesc}>{hormone.shortDescription}</Text>
              </View>
              <Text style={styles.expandIcon}>
                {expandedHormone === hormone.id ? '−' : '+'}
              </Text>
            </View>

            {expandedHormone === hormone.id && (
              <View style={styles.expandedContent}>
                <Text style={styles.hormoneDescription}>{hormone.description}</Text>
                
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Throughout Your Cycle:</Text>
                  {Object.entries(hormone.phases).map(([phase, description]) => (
                    <View key={phase} style={styles.phaseRow}>
                      <Text style={[styles.phaseLabel, { color: hormone.color }]}>
                        {phase.charAt(0).toUpperCase() + phase.slice(1)}:
                      </Text>
                      <Text style={styles.phaseDescription}>{description}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>What It Does:</Text>
                  {hormone.effects.map((effect, index) => (
                    <Text key={index} style={styles.effectItem}>• {effect}</Text>
                  ))}
                </View>

                <View style={[styles.funFactBox, { backgroundColor: hormone.color + '20' }]}>
                  <Text style={styles.funFactTitle}>💡 Fun Fact</Text>
                  <Text style={styles.funFactText}>{hormone.funFact}</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        ))}

        <View style={styles.bottomSection}>
          <Text style={styles.bottomTitle}>Remember:</Text>
          <Text style={styles.bottomText}>
            Every body is different, and your hormone levels can be affected by stress, sleep, diet, and exercise. 
            This is general information - if you have concerns about your hormones, talk to a healthcare provider!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    color: '#e91e63',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  hormoneCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hormoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hormoneEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  hormoneInfo: {
    flex: 1,
  },
  hormoneName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  hormoneShortDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  expandIcon: {
    fontSize: 24,
    color: '#e91e63',
    fontWeight: 'bold',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  hormoneDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  phaseRow: {
    marginBottom: 8,
  },
  phaseLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  phaseDescription: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    lineHeight: 20,
  },
  effectItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  funFactBox: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  funFactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  funFactText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  bottomSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bottomTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e91e63',
    marginBottom: 12,
  },
  bottomText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});

export default HormoneEducationScreen;