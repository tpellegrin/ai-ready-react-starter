// @fixture-path src/views/__arch__/Profile/Summary.tsx
// @expect no-restricted-syntax: Import styled elements by name
import * as S from './styles';

export const Summary = () => <S._ProfileRoot />;
