import { createReducer, on } from '@ngrx/store';
import { RouteItem, RouteItemBase, RoutingItems } from '../../models';
import * as RoutingActions from '../actions/routing.actions';

export const routingFeatureKey = 'routing';

export interface RoutingState {
  [baseApp: string]: RoutingItems;
}

export const initialRoutingState: RoutingState = {};

const buildChildren = (
  children: RouteItem[],
  path: string,
  hidden: boolean
): RouteItem[] => {
  return children.map((child) => {
    const match = child.routerLink.join('/') === path;

    return { ...child, hidden: match ? hidden : child.hidden };
  });
};

const buildChildrenTitle = (
  children: RouteItem[],
  path: string,
  label: string
): RouteItem[] => {
  return children.map((child) => {
    // const match = child.routerLink.join('/') === path;
    const match = child.icon === 'adjust';
    const split = path.split('/');

    return {
      ...child,
      label: match ? label : child.label,
      routerLink: match ? split : child.routerLink,
    };
  });
};

const buildMenuItems = (
  items: RouteItemBase[],
  path: string,
  hidden: boolean
): RouteItemBase[] => {
  return [...items].map((item) => {
    return { ...item, children: buildChildren(item.children, path, hidden) };
  });
};

const buildMenuTitleItems = (
  items: RouteItemBase[],
  path: any,
  label: string
): RouteItemBase[] => {
  return [...items].map((item) => {
    const split = path.split('/');

    return {
      ...item,
      children: buildChildrenTitle(item.children, split, label),
    };
  });
};

const findHiddenRouteByPath = (
  routingItems: RoutingItems,
  path: string,
  hidden: boolean
): RoutingItems => {
  return Object.keys(routingItems).reduce((acc, curr) => {
    return {
      ...acc,
      [curr]: Array.isArray(routingItems[curr])
        ? buildMenuItems(routingItems[curr], path, hidden)
        : routingItems[curr],
    };
  }, {}) as RoutingItems;
};

const updateTitle = (
  routingItems: RoutingItems,
  path: any,
  label: string
): RoutingItems => {
  debugger;
  return Object.keys(routingItems).reduce((acc, curr) => {
    return {
      ...acc,
      [curr]: Array.isArray(routingItems[curr])
        ? buildMenuTitleItems(routingItems[curr], path, label)
        : routingItems[curr],
    };
  }, {}) as RoutingItems;
};

export const routingReducer = createReducer(
  initialRoutingState,

  on(RoutingActions.addAppRouting, (state, action) => {
    return {
      ...state,
      [action.app]: {
        ...state[action.app],
        ...action.routingItems,
      },
    };
  }),
  on(RoutingActions.addRouteItemQuerySucceeded, (state, action) => {
    return {
      ...state,
      [action.app]: {
        ...state[action.app],
        queryParams: {
          ...state[action.app]?.queryParams,
          [action.routerLink]: action.queryParams,
        },
      },
    };
  }),
  on(RoutingActions.changeHiddenStatusByPath, (state, action) => {
    const { app, path, hidden } = action;

    const appRoutes = findHiddenRouteByPath(state[app], path, hidden);
    return {
      ...state,
      [app]: appRoutes,
    };
  }),
  on(RoutingActions.updateAppRoutingItem, (state, action) => {
    let { path, app, label } = action;

    const appRoutes = updateTitle(state[app], path, label);
    return {
      ...state,
      [app]: appRoutes,
    };
  })
);
