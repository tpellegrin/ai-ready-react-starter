// @fixture-path src/components/__arch__/FetchesData.tsx
// @expect boundaries/dependencies: Shared UI primitives receive data through props
import { useQueryClient } from '@tanstack/react-query';

export const FetchesData = () => <p>{String(useQueryClient().isFetching())}</p>;
