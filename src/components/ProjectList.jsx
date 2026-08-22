function ProjectList({ projects, numbered = false, showFork = false }) {
  if (!projects || projects.length === 0) {
    return (
      <p className="text-center text-base font-medium tracking-[-0.4px] text-[#c9d4cb]/60">
        Nothing here yet.
      </p>
    )
  }

  return (
    <ul className="text-left">
      {projects.map((project, index) => (
        <li
          key={project.name}
          className="flex flex-col gap-1 border-b border-[#f4f1ea]/25 py-7 max-sm:py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
        >
          <div className="flex items-baseline gap-4">
            {numbered && (
              <span className="text-sm text-[#c9d4cb]/60">
                {String(index + 1).padStart(2, '0')}
              </span>
            )}
            <h2 className="font-display text-2xl font-medium tracking-[-1px] text-[#f4f1ea] max-sm:text-xl">
              <a
                href={project.html_url || `https://github.com/namann5/${project.name}`}
                target="_blank"
                rel="noreferrer"
                className="transition-opacity hover:opacity-70"
              >
                {project.name}
              </a>
            </h2>
          </div>
          <p className="text-[#c9d4cb] sm:max-w-[55%] sm:text-right">
            <span className="font-medium tracking-[-0.4px] max-sm:text-base">
              {project.description || 'No description yet.'}
            </span>
            <span className="mx-3 text-[#f4f1ea]/30">·</span>
            <span className="text-sm text-[#c9d4cb]">
              {project.language || '—'}
            </span>
            {project.stargazers_count > 0 && (
              <span className="mx-3 text-[#f4f1ea]/30">
                ★ {project.stargazers_count}
              </span>
            )}
            {showFork && project.fork && (
              <span className="mx-3 text-sm uppercase tracking-[0.15em] text-[#c9d4cb]/50">
                fork
              </span>
            )}
            {project.homepage && (
              <a
                href={project.homepage}
                target="_blank"
                rel="noreferrer"
                className="mx-3 text-sm uppercase tracking-[0.15em] text-[#ffd9a0] transition-opacity hover:opacity-70"
              >
                live ↗
              </a>
            )}
          </p>
        </li>
      ))}
    </ul>
  )
}

export default ProjectList
