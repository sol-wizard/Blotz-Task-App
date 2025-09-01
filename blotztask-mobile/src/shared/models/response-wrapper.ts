export interface ResponseWrapper<T> {
  data: T;
  message: string;
  success: boolean;
}
