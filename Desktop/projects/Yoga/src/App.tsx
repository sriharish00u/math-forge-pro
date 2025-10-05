import './App.css'
import YogaTrainer from './components/YogaTrainer'

function App() {
  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Project Evolving Yoga</h1>
        <p className="subtitle">Offline, adaptive yoga trainer — privacy-first</p>
      </header>
      <main>
        <YogaTrainer />
      </main>
    </div>
  )
}

export default App
