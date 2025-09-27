import React from 'react';
import { View, Text } from 'react-native';

export default function BarMini({ data, max, height = 46 }) {
  const mx = max ?? Math.max(...data.map(d => d.value), 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
      {data.map((d, i) => {
        const h = Math.max(6, Math.round((d.value / mx) * height));
        return (
          <View key={i} style={{ alignItems: 'center' }}>
            <View style={{ width: 10, height: h, borderRadius: 5, backgroundColor: '#8B5CF6' }} />
            <Text style={{ marginTop: 4, fontSize: 11, color: '#9AA0A6' }}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}