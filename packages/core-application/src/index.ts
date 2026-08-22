export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}

export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}
