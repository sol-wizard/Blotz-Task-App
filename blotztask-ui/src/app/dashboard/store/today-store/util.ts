// A helpfer function to perform an action and then refresh the tasks (so we don't have to repeat the code in multiple places) DRY
export const performTaskAndRefresh = async (
  action: () => Promise<unknown>,
  reloadTasks: () => Promise<unknown>,
  setLoading: (value: boolean) => void
) => {
  try {
    setLoading(true); // Set loading to true before performing the action
    await action();
    await reloadTasks();
  } catch (error) {
    console.error('Error performing action:', error);
  } finally {
    setLoading(false); // Ensure loading is set to false, even if an error occurs
  }
};
