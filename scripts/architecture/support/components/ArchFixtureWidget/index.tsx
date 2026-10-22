// Throwaway shared component materialized by `pnpm arch:check`, so the
// component-boundary fixtures never depend on real (changeable) components.
import { useArchFixtureWidget } from './logic';
import { _ArchFixtureWidgetLabel, _ArchFixtureWidgetRoot } from './styles';

export const ArchFixtureWidget = ({ label }: { label: string }) => {
  const { text } = useArchFixtureWidget(label);
  return (
    <_ArchFixtureWidgetRoot>
      <_ArchFixtureWidgetLabel>{text}</_ArchFixtureWidgetLabel>
    </_ArchFixtureWidgetRoot>
  );
};
