import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView
} from 'react-native'
import { supabase } from '../lib/supabase'
import CycleWheel from '../components/CycleWheel'
import DailyInsights from '../components/DailyInsights'
import { calculateCyclePhase } from '../utils/cycleCalculations'

const HomeScreen = ({ navigation }) => {
  const [user, setUser] = useState(null)
  const [periods, setPeriods] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cycleData, setCycleData] = useState(null)

  useEffect(() => {
    getUser()
    fetchPeriods()
  }, [])

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const fetchPeriods = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('periods')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false })

      if (error) {
        console.error('Error fetching periods:', error)
        Alert.alert('Error', 'Failed to load period data')
      } else {
        setPeriods(data || [])
        // Calculate cycle data from most recent period
        if (data && data.length > 0) {
          const latestPeriod = data[0]
          const calculatedCycleData = calculateCyclePhase(latestPeriod.start_date)
          setCycleData(calculatedCycleData)
        }
      }
    } catch (error) {
      console.error('Error fetching periods:', error)
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchPeriods()
  }

  const handleDeletePeriod = async (periodId) => {
    Alert.alert(
      'Delete Period Entry',
      'Are you sure you want to delete this period entry? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('periods')
                .delete()
                .eq('id', periodId)

              if (error) {
                console.error('Error deleting period:', error)
                Alert.alert('Error', 'Failed to delete period entry')
              } else {
                Alert.alert('Success', 'Period entry deleted successfully')
                fetchPeriods() // Refresh the list
              }
            } catch (error) {
              console.error('Error deleting period:', error)
              Alert.alert('Error', 'An unexpected error occurred')
            }
          }
        }
      ]
    )
  }

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.auth.signOut()
            if (error) {
              Alert.alert('Error', 'Failed to sign out')
            }
          }
        }
      ]
    )
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getFlowLevelText = (level) => {
    const flowLevels = {
      1: 'Light',
      2: 'Light-Medium',
      3: 'Medium',
      4: 'Medium-Heavy',
      5: 'Heavy'
    }
    return flowLevels[level] || 'Unknown'
  }

  const renderPeriodItem = ({ item }) => (
    <View style={styles.periodCard}>
      <View style={styles.periodHeader}>
        <Text style={styles.periodDate}>
          {formatDate(item.start_date)}
          {item.end_date && ` - ${formatDate(item.end_date)}`}
        </Text>
        {item.flow_level && (
          <Text style={styles.flowLevel}>
            {getFlowLevelText(item.flow_level)}
          </Text>
        )}
      </View>
      
      {item.symptoms && item.symptoms.length > 0 && (
        <Text style={styles.symptoms}>
          Symptoms: {item.symptoms.join(', ')}
        </Text>
      )}
      
      {item.notes && (
        <Text style={styles.notes} numberOfLines={2}>
          Notes: {item.notes}
        </Text>
      )}
    </View>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e91e63" />
        <Text style={styles.loadingText}>Loading your data...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome back, {user?.email?.split('@')[0]}!
        </Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#e91e63']}
            tintColor="#e91e63"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <CycleWheel cycleData={cycleData} />
        
        <DailyInsights cycleData={cycleData} />

        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('HormoneEducation')}
          >
            <Text style={styles.actionEmoji}>🧬</Text>
            <Text style={styles.actionText}>Learn About Hormones</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Period History</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => navigation.navigate('AddPeriod')}
            >
              <Text style={styles.addButtonText}>+ Add Period</Text>
            </TouchableOpacity>
          </View>

          {periods.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No period entries yet
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Tap "Add Period" to start tracking
              </Text>
            </View>
          ) : (
            periods.map((item) => (
              <View key={item.id} style={styles.periodCard}>
                <View style={styles.periodHeader}>
                  <View style={styles.periodInfo}>
                    <Text style={styles.periodDate}>
                      {formatDate(item.start_date)}
                      {item.end_date && ` - ${formatDate(item.end_date)}`}
                    </Text>
                    {item.flow_level && (
                      <Text style={styles.flowLevel}>
                        {getFlowLevelText(item.flow_level)}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => navigation.navigate('AddPeriod', { 
                        editMode: true, 
                        periodData: item 
                      })}
                    >
                      <Text style={styles.editButtonText}>✏️</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDeletePeriod(item.id)}
                    >
                      <Text style={styles.deleteButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {item.symptoms && item.symptoms.length > 0 && (
                  <Text style={styles.symptoms}>
                    Symptoms: {item.symptoms.join(', ')}
                  </Text>
                )}
                
                {item.mood && (
                  <Text style={styles.mood}>
                    Mood: {item.mood}
                  </Text>
                )}
                
                {item.energy && (
                  <Text style={styles.energy}>
                    Energy: {item.energy}
                  </Text>
                )}
                
                {item.notes && (
                  <Text style={styles.notes} numberOfLines={2}>
                    Notes: {item.notes}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
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
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  signOutButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e91e63',
  },
  signOutText: {
    color: '#e91e63',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#e91e63',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
  },
  periodCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  periodInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  periodDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  flowLevel: {
    fontSize: 14,
    color: '#e91e63',
    fontWeight: '500',
  },
  symptoms: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  quickActions: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e91e63',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionText: {
    color: '#e91e63',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#e3f2fd',
  },
  editButtonText: {
    fontSize: 16,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#ffe6ee',
  },
  deleteButtonText: {
    fontSize: 16,
  },
  mood: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  energy: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
})

export default HomeScreen