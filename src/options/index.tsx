import { render } from "preact"
import { Options } from './Options'

const insertElement: HTMLElement = document.querySelector('#app') ?? document.body

render(<Options />, insertElement)