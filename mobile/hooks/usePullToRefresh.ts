import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl } from 'react-native';

type Options = {
  externalRefreshing?: boolean;
};

type UsePullToRefreshResult = {
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  refreshControl: JSX.Element;
};

export function usePullToRefresh(
  action: () => Promise<void>,
  options: Options = {},
): UsePullToRefreshResult {
  const { externalRefreshing } = options;
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (externalRefreshing !== undefined) {
      await action();
      return;
    }

    try {
      setRefreshing(true);
      await action();
    } finally {
      setRefreshing(false);
    }
  }, [action, externalRefreshing]);

  const effectiveRefreshing = externalRefreshing ?? refreshing;

  const refreshControl = useMemo(
    () => React.createElement(RefreshControl, { refreshing: effectiveRefreshing, onRefresh }),
    [effectiveRefreshing, onRefresh],
  );

  return { refreshing: effectiveRefreshing, onRefresh, refreshControl };
}
