import TodoWidget from './TodoWidget'

export default function HomePage(): React.JSX.Element {
  return (
    <section>
      <h1 className="text-[20px] font-medium tracking-tight">Home</h1>
      <p className="mt-2 max-w-xl text-sm text-text-muted">
        Daily overview. Upcoming events and recent notes will appear here too.
      </p>

      <div className="mt-6 max-w-xl">
        <TodoWidget />
      </div>
    </section>
  )
}
