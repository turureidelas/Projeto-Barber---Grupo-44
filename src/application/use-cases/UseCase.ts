/** Single entry point of every use case. The UI only ever calls `execute`. */
export interface UseCase<Input, Output> {
  execute(input: Input): Promise<Output>;
}
