import { Dispatch, SetStateAction } from 'react';
import type { RouterType } from 'globals/types';

export type ContextProps = {
  routerType: RouterType;
  setRouterType: Dispatch<SetStateAction<RouterType>>;
};
