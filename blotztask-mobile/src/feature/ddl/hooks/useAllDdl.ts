import { useQuery } from "@tanstack/react-query";
import { getAllDdlTasks } from "../services/ddl-services";
import { ddlKeys } from "@/shared/constants/query-key-factory";

export const useAllDdl = () => {
  const { data: ddlTasks, isLoading } = useQuery({
    queryKey: ddlKeys.all,
    queryFn: () => getAllDdlTasks(),
  });

  return {
    ddlTasks: ddlTasks ?? [],
    isLoading,
  };
};
