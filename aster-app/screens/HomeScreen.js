import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native'
import { supabase } from '../lib/supabase'

const HomeScreen = ({ navigation }) => {
  const [user, setUser] = useState(null)
  const [periods, setPeriods] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

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
          <FlatList
            data={periods}
            renderItem={renderPeriodItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#e91e63']}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    flex: 1,
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
    alignItems: 'center',
    marginBottom: 8,
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
})

export default HomeScreen