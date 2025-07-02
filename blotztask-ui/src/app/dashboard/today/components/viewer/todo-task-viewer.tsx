import SectionSeparator from '../../../shared/components/ui/section-separator';
import TaskCardContainer from '@/app/dashboard/shared/components/taskcard/task-card-container';
import TaskExitAnimation from '@/app/dashboard/shared/components/ui/task-exit-animation';
import { Fragment, useState } from 'react';

export function TodoTaskViewer({
  todoTasks,
  handleTodoCheckboxChange,
  handleTaskEdit,
  handleTaskDelete,
  handleTaskDeleteUndo,
}) {
  const [animatingTasks, setAnimatingTasks] = useState<Set<number>>(new Set());

  const handleCheckboxWithAnimation = (taskId) => {
    
    setAnimatingTasks(prev => new Set(prev).add(taskId));

    
    setTimeout(() => {
      setAnimatingTasks(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      handleTodoCheckboxChange(taskId); 
    }, 400); 
  };
  return (
    <>
      {todoTasks.length > 0 ? (
        <div className="grid gap-4 w-full">
          {todoTasks.map((task) => {
          const isVisible = !animatingTasks.has(task.id);
            return(
              <Fragment key={task.id}>
              <TaskExitAnimation isVisible={isVisible}>
                <SectionSeparator />
              
                <TaskCardContainer
                  key={task.id}
                  task={task}
                  taskStatus="todo"
                  handleCheckboxChange={handleCheckboxWithAnimation}
                  handleTaskEdit={handleTaskEdit}
                  handleTaskDelete={handleTaskDelete}
                  handleTaskDeleteUndo={handleTaskDeleteUndo}
                />
              
                
                
            </TaskExitAnimation>
            </Fragment>
          )})}
        </div>
      ) : (
        <p>No incomplete tasks for today!</p>
      )}
    </>
  );
}
