import { Button } from '@gluestack-ui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable } from 'react-native';
import ThemedText from '@/components/ui/custom/ThemedText';

export default function GradientButton({ onPress, children , textClass = "text-white font-medium text-center"}) {
  return (
    <Button asChild className="rounded-xl overflow-hidden">
      <Pressable onPress={onPress}>
        {/* <LinearGradient
          colors={['#3b82f6', '#06b6d4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="px-4 py-3 w-full items-center justify-center"
        > */}
          <ThemedText className="">
            {children}
          </ThemedText>
        {/* </LinearGradient> */}
      </Pressable>
    </Button>
  );
}
