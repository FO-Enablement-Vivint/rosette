import './App.css'
import Editor from './components/Editor/Editor'
import Panel from './components/Panel'
import { convertFromRicosDocument } from './nodes/ricos'
import { DOORBELL_CAMERA_PRO_GEN_1 } from './tests/ricos-sample'

function App() {

  const defaultValue = convertFromRicosDocument(DOORBELL_CAMERA_PRO_GEN_1)

  return (
    <div className='flex flex-col items-center w-full h-screen justify-center'>
        <div className='flex flex-col items-center justify-center h-full max-w-150'>
          <Panel className='w-200'>
            <div className='flex flex-col gap-4 w-full'>
              <p>Rosette</p>
              <Editor defaultValue={defaultValue} />
            </div>
          </Panel>
        </div>
    </div>
  )
}

export default App
