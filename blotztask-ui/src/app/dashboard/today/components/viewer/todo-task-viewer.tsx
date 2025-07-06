import SectionSeparator from '../../../shared/components/ui/section-separator';
import TaskCardContainer from '@/app/dashboard/shared/components/taskcard/task-card-container';
import { AnimatePresence, motion } from 'framer-motion';
import { Fragment, useState } from 'react';

const taskVariants = {
  normal: { opacity: 1, y: 0 },
  removing: { opacity: 0, y: -30 },
};

export function TodoTaskViewer({
  todoTasks,
  handleTodoCheckboxChange,
  handleTaskEdit,
  handleTaskDelete,
  handleTaskDeleteUndo,
}) {
  const [animatingTasks, setAnimatingTasks] = useState<Set<number>>(new Set());

  const handleCheckboxWithAnimation = (taskId) => {
    setAnimatingTasks((prev) => new Set(prev).add(taskId));

    setTimeout(() => {
      handleTodoCheckboxChange(taskId);
      setAnimatingTasks((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }, 400);
  };

  return (
    <>
      {todoTasks.length > 0 ? (
        <div className="grid gap-4 w-full">
          <AnimatePresence mode="popLayout">
            {todoTasks
              .filter((task) => !animatingTasks.has(task.id))
              .map((task) => {
                return (
                  <motion.div
                    key={task.id}
                    layout
                    variants={taskVariants}
                    initial="normal"
                    animate="normal"
                    exit="removing"
                    transition={{ duration: 0.3 }}
                  >
                    <Fragment key={task.id}>
                      <TaskCardContainer
                        key={task.id}
                        task={task}
                        taskStatus="todo"
                        handleCheckboxChange={handleCheckboxWithAnimation}
                        handleTaskEdit={handleTaskEdit}
                        handleTaskDelete={handleTaskDelete}
                        handleTaskDeleteUndo={handleTaskDeleteUndo}
                      />
                      <SectionSeparator />
                    </Fragment>
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </div>
      ) : (
        <p>No incomplete tasks for today!</p>
      )}
    </>
  );
}
