function Logo() {
  return (
    <div
      role="img"
      aria-label="Home"
      className="flex w-max items-center max-sm:scale-75"
    >
      <svg
        width="54"
        height="40"
        viewBox="0 0 54 40"
        fill="none"
        aria-hidden="true"
      >
        <path d="M38 0H26V12H38V0Z" fill="white" />
        <path d="M54 12H38V28H54V12Z" fill="white" />
        <path d="M38 28H26V40H38V28Z" fill="white" />
        <path d="M26 12H16V22H26V12Z" fill="white" />
        <path d="M16 22H8V30H16V22Z" fill="white" />
        <path d="M16 2H6V12H16V2Z" fill="white" />
        <path d="M6 12H0V18H6V12Z" fill="white" />
      </svg>
    </div>
  )
}

export default Logo
