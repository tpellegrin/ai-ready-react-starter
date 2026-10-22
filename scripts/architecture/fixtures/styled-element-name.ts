// @fixture-path src/views/__arch__/Badge/styles.ts
// @expect starter/styled-element-names: must be named _Badge<Part> (e.g. _BadgeRoot)
// @expect starter/styled-element-names: (e.g. _BadgeCardRow)
// Internal elements carry their owning component's name.
import { styled } from 'styled-components';

export const Root = styled.span``;
export const _CardRow = styled.div.attrs({ role: 'row' })``;
export const _BadgeIcon = styled.span``;
