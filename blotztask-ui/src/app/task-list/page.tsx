'use client';

import { useState } from 'react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { TaskItemDTO } from '@/model/task-Item-dto';
import { fetchAllTaskItems } from '@/services/taskService';
import { Trash } from 'lucide-react';
import { DeleteDialog } from './components/delete-confirmation-dialog';



export default function Page() {
    const [taskList, setTaskList] = useState<TaskItemDTO[]>([]);
    const [isDialogOpen, setDialogOpen] = useState(false);

  const loadTasks = async () => {
    const data = await fetchAllTaskItems();
    setTaskList(data);
    console.log(taskList);
  };

  /**
   * Fetch the tasks once and set the hook on the first rendering
   */
  useEffect(() => {
    loadTasks();
  }, []); // Runs on the first render using [] parameter and rerun when state changes, e.g add task

  


    return (
        <div className="flex flex-col items-end mt-10 mr-10">

          <div className="flex  mt-10 mr-10 w-full justify-between">
            <div>
              <p className=" text-5xl font-bold">All Task</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/add-task">
                <Button className="bg-all-task-add-button-bg text-all-task-add-button-text border-2 border-all-task-add-button-border">
                  <span className="">+ </span>Add Task
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="mt-10">
            <Button asChild className="ml-auto">
              <Link href="/">Return Home Page</Link>
            </Button>
          </div>
          
          <Button
            variant="outline"
            className="bg-all-task-delete-button-bg text-white border-2"
            onClick={() => setDialogOpen(true)}
          >
            <Trash />
          </Button>

          <div>
            <Button onClick={() => setDialogOpen(true)}>Delete Task</Button>
            <DeleteDialog isDialogOpen={isDialogOpen} setDialogOpen={setDialogOpen} />
          </div>


        </div>
      );
}
