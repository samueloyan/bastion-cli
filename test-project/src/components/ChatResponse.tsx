export function ChatResponse({ response }: { response: string }) {
  return <div dangerouslySetInnerHTML={{ __html: response }} />;
}
