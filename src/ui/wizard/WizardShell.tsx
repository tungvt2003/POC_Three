import { STEPS, useUiStore, type StepNumber } from '../uiStore'
import { Step1Shape } from './Step1Shape'
import { Step2Size } from './Step2Size'
import { Step3Openings } from './Step3Openings'
import { Step4Style } from './Step4Style'

/**
 * Sidebar wizard: một bước hỏi một việc.
 *
 * Dải số 1–4 ở đầu bấm được — nhảy thẳng tới bước bất kỳ mà không mất dữ liệu,
 * vì toàn bộ thiết kế nằm trong `designStore`, còn "đang ở bước mấy" chỉ là
 * state giao diện.
 */
export function WizardShell() {
  const step = useUiStore((s) => s.step)
  const hasFinished = useUiStore((s) => s.hasFinished)
  const goTo = useUiStore((s) => s.goTo)
  const next = useUiStore((s) => s.next)
  const back = useUiStore((s) => s.back)
  const finish = useUiStore((s) => s.finish)

  const meta = STEPS[step - 1]

  return (
    <aside className="wiz">
      <header className="wiz-head">
        <nav className="steps">
          {STEPS.map((st) => (
            <button
              key={st.n}
              className={'step-dot' + (st.n === step ? ' is-on' : '')}
              title={st.title}
              onClick={() => goTo(st.n as StepNumber)}
            >
              {st.n}
            </button>
          ))}
        </nav>
        <h1>{meta.title}</h1>
        {meta.hint && <p className="wiz-hint">{meta.hint}</p>}
      </header>

      <div className="wiz-body">
        {step === 1 && <Step1Shape />}
        {step === 2 && <Step2Size />}
        {step === 3 && <Step3Openings />}
        {step === 4 && <Step4Style />}
      </div>

      <footer className="wiz-foot">
        {step > 1 && (
          <button className="btn" onClick={back}>
            Quay lại
          </button>
        )}
        {/* Đã xong một lần rồi thì bước nào cũng thoát nhanh về chế độ thiết kế được */}
        {step < 4 && hasFinished && (
          <button className="btn" onClick={finish}>
            Xong
          </button>
        )}
        {step < 4 ? (
          <button className="btn btn-primary" onClick={next}>
            Tiếp
          </button>
        ) : (
          <button className="btn btn-primary" onClick={finish}>
            Xong
          </button>
        )}
      </footer>
    </aside>
  )
}
