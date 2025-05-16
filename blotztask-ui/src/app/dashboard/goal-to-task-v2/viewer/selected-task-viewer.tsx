import { TaskDetailDTO } from '@/model/task-detail-dto';
import TaskCardSelection from '../components/task-card-selection';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

export default function SelectedTaskViewer({
  selectedTasks,
  handleCheckBoxChange,
}: {
  selectedTasks: TaskDetailDTO[];
  handleCheckBoxChange: (taskId: number) => void;
}) {
  return (
    <div className={`flex ${selectedTasks.length !== 0 ? 'flex-[2]' : 'hidden'}`}>
      {selectedTasks.length !== 0 && (
        <Card className="ml-6 mt-4">
          <CardHeader>
            <CardTitle>Selected Tasks</CardTitle>
          </CardHeader>
          {selectedTasks.map((task) => (
            <TaskCardSelection key={task.id} task={task} handleCheckBoxChange={handleCheckBoxChange} />
          ))}
        </Card>
      )}
    </div>
  );
}
