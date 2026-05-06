import { useEffect } from 'react';

export const useDisableBodyTextSelect = (
  disableTextSelect: boolean,
  effectEnabled = true,
) => {
  useEffect(() => {
    if (!effectEnabled) {
      return;
    }

    if (disableTextSelect) {
      document.body.classList.add('no-select');
    } else {
      document.body.classList.remove('no-select');
    }

    return () => {
      document.body.classList.remove('no-select');
    };
  }, [disableTextSelect, effectEnabled]);
};
