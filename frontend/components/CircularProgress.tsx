import { Text, View } from 'react-native';
import { Colors } from '@/constants/colors';

function getColor(value: number) {
  if (value >= 75) return Colors.green;
  if (value >= 50) return Colors.amber;
  return Colors.red;
}

interface Props {
  value: number;
  size?: number;
  label?: string;
}

/**
 * Circular arc progress ring using two-half clip technique.
 * No external dependencies required.
 *
 * Formula derivation:
 *   borderTop + borderRight covers the 315°→135° arc (top-right half).
 *   rightDeg rotates it so the visible arc in the right clip = 0° → min(angle, 180°).
 *   borderBottom + borderLeft covers 135°→315° (bottom-left half).
 *   leftDeg rotates it so the visible arc in the left clip = 180° → angle (when > 180°).
 */
export default function CircularProgress({ value, size = 68, label }: Props) {
  const strokeWidth = 8;
  const half = size / 2;
  const color = getColor(value);
  const angle = (value / 100) * 360;

  const rightDeg = angle <= 180 ? angle - 135 : 45;
  const leftDeg = angle > 180 ? angle - 315 : -135;

  return (
    <View style={{ width: size, height: size }}>
      {/* Gray background ring */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: strokeWidth,
          borderColor: 'rgba(0,0,0,0.08)',
        }}
      />

      {/* Right half clip — shows 0° → min(angle, 180°) */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: half,
          height: size,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: -half,
            width: size,
            height: size,
            borderRadius: half,
            borderWidth: strokeWidth,
            borderTopColor: color,
            borderRightColor: color,
            borderBottomColor: 'transparent',
            borderLeftColor: 'transparent',
            transform: [{ rotate: `${rightDeg}deg` }],
          }}
        />
      </View>

      {/* Left half clip — shows 180° → angle (only when angle > 180°) */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: half,
          height: size,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: -half,
            width: size,
            height: size,
            borderRadius: half,
            borderWidth: strokeWidth,
            borderTopColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: angle > 180 ? color : 'transparent',
            borderLeftColor: angle > 180 ? color : 'transparent',
            transform: [{ rotate: `${leftDeg}deg` }],
          }}
        />
      </View>

      {/* Score */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontSize: Math.round(size * 0.25),
            fontWeight: '700',
            color,
          }}
        >
          {value}%
        </Text>
        {label && (
          <Text
            style={{
              fontSize: Math.round(size * 0.13),
              fontWeight: '600',
              color,
              marginTop: 2,
            }}
          >
            {label}
          </Text>
        )}
      </View>
    </View>
  );
}
