import { useCallback } from 'react';

import { useNavigation } from 'globals/context/NavigationContext';
import { TransitionType } from 'containers/Layouts/common/LayoutTransitionContainer/types';
import { prefersReducedMotion } from 'utils/transitions/config';

/**
 * Hook for transition-related functionality
 * Provides methods for determining transition classes and handling reduced motion preferences
 */
export const useTransition = () => {
  const { transition } = useNavigation();

  const shouldReduceMotion = prefersReducedMotion();

  /**
   * Get the appropriate transition class based on the current transition and user preferences
   * @param baseClass The base CSS class name
   * @returns The complete class name including transition-specific modifiers
   */
  const getTransitionClass = useCallback(
    (baseClass: string) => {
      if (shouldReduceMotion) {
        return `${baseClass} ${baseClass}--reduced-motion`;
      }

      return transition
        ? `${baseClass} ${baseClass}--${transition}`
        : baseClass;
    },
    [transition, shouldReduceMotion],
  );

  return {
    currentTransition: transition,
    isTransitioning: !!transition,
    transitionType: transition as TransitionType,
    getTransitionClass,
    shouldReduceMotion,
  };
};
