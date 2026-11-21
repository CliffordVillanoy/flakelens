// Renders `backticked` parts of a copy string as <code>; everything stays plain text.
export function WithCode({ text }: { text: string }) {
  return (
    <>
      {text.split('`').map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : part))}
    </>
  );
}
