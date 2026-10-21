import { Flex } from 'components/Flex';
import { LoadingState } from 'components/LoadingState';

/** Shown while the session is being restored at startup. */
export const AppLoading = () => (
  <Flex alignItems="center" justifyContent="center" height="100%">
    <LoadingState />
  </Flex>
);
