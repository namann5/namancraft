import PageShell from '../components/PageShell'
import { GITHUB_USERNAME } from '../lib/github'

function Contact() {
  return (
    <PageShell>
      <div className="w-full max-w-[720px] text-center">
        <h1 className="gradient-text page-title">Contact</h1>
        <div
          className="mx-auto mt-10 h-px w-full bg-[#f4f1ea]/50 max-sm:mt-8"
          aria-hidden="true"
        />
        <a
          href="mailto:naman.2002.as@gmail.com"
          className="mt-10 block break-all font-display text-3xl font-normal leading-[1.1] tracking-[-1px] text-[#f4f1ea] transition-opacity hover:opacity-70 max-sm:mt-8 max-sm:text-2xl"
        >
          naman.2002.as@gmail.com
        </a>
        <p className="mt-8 text-lg font-medium leading-[1.6] tracking-[-0.4px] text-[#c9d4cb] max-sm:text-base">
          Open to new work, collaborations, and conversations. Reply time:
          faster than a GitHub Actions run.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 max-sm:mt-8">
          <a
            href={`https://github.com/${GITHUB_USERNAME}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm uppercase tracking-[0.2em] text-[#f4f1ea]/50 transition-opacity hover:opacity-100 hover:text-[#f4f1ea]"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/naman-singh-dev"
            target="_blank"
            rel="noreferrer"
            className="text-sm uppercase tracking-[0.2em] text-[#f4f1ea]/50 transition-opacity hover:opacity-100 hover:text-[#f4f1ea]"
          >
            LinkedIn
          </a>
          <a
            href="#"
            className="text-sm uppercase tracking-[0.2em] text-[#f4f1ea]/50 transition-opacity hover:opacity-100 hover:text-[#f4f1ea]"
          >
            Instagram
          </a>
        </div>
      </div>
    </PageShell>
  )
}

export default Contact
