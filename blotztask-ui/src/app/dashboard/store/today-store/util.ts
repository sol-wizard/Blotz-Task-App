// A helpfer function to perform an action and then refresh the tasks (so we don't have to repeat the code in multiple places) DRY
export const performTaskAndRefresh = async <T>(
  action: () => Promise<T>,
  reloadTasks: () => Promise<unknown>,
  setLoading: (value: boolean) => void
): Promise<T | undefined> => {
  try {
    setLoading(true);
    const result = await action();
    await reloadTasks();
    return result;
  } catch (error) {
    console.error('Error performing action:', error);
    return undefined;
  } finally {
    setLoading(false);
  }
};
