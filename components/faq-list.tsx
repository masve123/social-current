import { Plus } from "lucide-react";

export function FaqList({ items }: { items: readonly { question: string; answer: string }[] }) {
  return (
    <div className="faq-list">
      {items.map((item, index) => (
        <details key={item.question} open={index === 0}>
          <summary><span>{item.question}</span><Plus aria-hidden="true" /></summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
