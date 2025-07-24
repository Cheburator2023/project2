const aggregationIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M3.332 2.41A.75.75 0 0 1 4 2h8a.75.75 0 0 1 .75.75v2.063a.75.75 0 0 1-1.5 0V3.5H5.473l3.134 4.309a.75.75 0 0 1 0 .882L5.473 13h5.777v-1.312a.75.75 0 0 1 1.5 0v2.062a.75.75 0 0 1-.75.75H4a.75.75 0 0 1-.607-1.191l3.68-5.059-3.68-5.059a.75.75 0 0 1-.061-.781Z" clip-rule="evenodd"/></svg>`;
const arrowsIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><g clip-path="url(#a)"><path fill="#000" fill-rule="evenodd" d="M8.53.803a.75.75 0 0 0-1.06 0l-2 2a.75.75 0 0 0 1.06 1.06l.72-.719V7.25H3.144l.72-.72a.75.75 0 0 0-1.061-1.06l-2 2a.75.75 0 0 0 0 1.06l2 2a.75.75 0 1 0 1.06-1.06l-.719-.72H7.25v4.106l-.72-.72a.75.75 0 1 0-1.06 1.061l2 2a.75.75 0 0 0 1.06 0l2-2a.75.75 0 0 0-1.06-1.06l-.72.719V8.75h4.106l-.72.72a.75.75 0 1 0 1.061 1.06l2-2a.75.75 0 0 0 0-1.06l-2-2a.75.75 0 0 0-1.06 1.06l.719.72H8.75V3.144l.72.72a.75.75 0 1 0 1.06-1.061l-2-2Z" clip-rule="evenodd"/></g><defs><clipPath id="a"><path fill="#fff" d="M0 0h16v16H0z"/></clipPath></defs></svg>`;
const ascIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M8.28 2.97a.75.75 0 0 0-1.06 0l-4.5 4.5a.75.75 0 0 0 1.06 1.06L7 5.31v7.19a.75.75 0 0 0 1.5 0V5.31l3.22 3.22a.75.75 0 1 0 1.06-1.06l-4.5-4.5Z" clip-rule="evenodd"/></svg>`;
const cancelIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M12.78 4.78a.75.75 0 0 0-1.06-1.06L8.25 7.19 4.78 3.72a.75.75 0 0 0-1.06 1.06l3.47 3.47-3.47 3.47a.75.75 0 1 0 1.06 1.06l3.47-3.47 3.47 3.47a.75.75 0 1 0 1.06-1.06L9.31 8.25l3.47-3.47Z" clip-rule="evenodd"/></svg>`;
const chartIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M8.25 1.917a.75.75 0 0 1 .75.75v10.666a.75.75 0 0 1-1.5 0V2.667a.75.75 0 0 1 .75-.75Zm4 4a.75.75 0 0 1 .75.75v6.666a.75.75 0 0 1-1.5 0V6.667a.75.75 0 0 1 .75-.75ZM5 9.333a.75.75 0 0 0-1.5 0v4a.75.75 0 0 0 1.5 0v-4Z" clip-rule="evenodd"/></svg>`;
const _checkboxCheckedIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="black"><path d="M3.467.04c-.471.065-.842.18-1.254.387C1.094.989.328 2.001.063 3.267.016 3.496.013 3.705.013 8s.003 4.504.05 4.733c.345 1.648 1.525 2.838 3.169 3.194l.275.06h8.986l.275-.06c1.635-.354 2.805-1.524 3.159-3.159l.06-.275V3.507l-.06-.275c-.358-1.655-1.549-2.827-3.22-3.171-.193-.04-.644-.045-4.6-.05C4.595.006 3.669.012 3.467.04m8.848 4.213c.283.154.438.42.438.752 0 .369.132.213-2.86 3.356-2.503 2.629-2.691 2.821-2.851 2.9a.646.646 0 0 1-.362.084c-.363 0-.369-.004-1.739-1.377C3.577 8.6 3.597 8.626 3.597 8.253c0-.47.314-.807.779-.834.394-.023.366-.043 1.391.977.774.77.905.89.936.856l2.361-2.486c1.647-1.732 2.359-2.463 2.438-2.504.176-.09.231-.101.458-.093.177.006.239.021.355.084"/></svg>`;
const _checkboxIndeterminateIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="black"><path d="M3.467.04c-.471.065-.842.18-1.254.387C1.094.989.328 2.001.063 3.267.016 3.496.013 3.705.013 8s.003 4.504.05 4.733c.345 1.648 1.525 2.838 3.169 3.194l.275.06h8.986l.275-.06c1.635-.354 2.805-1.524 3.159-3.159l.06-.275V3.507l-.06-.275c-.358-1.655-1.549-2.827-3.22-3.171-.193-.04-.644-.045-4.6-.05C4.595.006 3.669.012 3.467.04M12.43 7.1c.178.088.403.316.485.493.048.105.058.175.058.407 0 .251-.007.295-.072.428a1.043 1.043 0 0 1-.756.559c-.214.035-8.076.035-8.29 0a1.038 1.038 0 0 1-.754-.557 1.157 1.157 0 0 1-.051-.729c.08-.275.337-.543.612-.639.131-.045.363-.047 4.378-.041l4.24.006.15.073"/></svg>`;
const _checkboxUncheckedIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="black"><path d="M3.467.04c-.471.065-.842.18-1.254.387C1.094.989.328 2.001.063 3.267.016 3.496.013 3.705.013 8s.003 4.504.05 4.733c.345 1.648 1.525 2.838 3.169 3.194l.275.06h8.986l.275-.06c1.635-.354 2.805-1.524 3.159-3.159l.06-.275V3.507l-.06-.275c-.358-1.655-1.549-2.827-3.22-3.171-.193-.04-.644-.045-4.6-.05C4.595.006 3.669.012 3.467.04m9.07 1.012a3.023 3.023 0 0 1 2.411 2.411c.058.335.058 8.739 0 9.074-.216 1.229-1.198 2.196-2.468 2.427-.296.053-8.664.053-8.96 0-1.27-.231-2.252-1.198-2.468-2.427-.058-.335-.058-8.739 0-9.074a3.062 3.062 0 0 1 .829-1.582 3.11 3.11 0 0 1 1.568-.828c.302-.055 8.775-.055 9.088-.001"/></svg>`;
const _colorPickerIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><g clip-path="url(#a)"><path fill="#000" fill-rule="evenodd" d="M3.864.803a.75.75 0 0 0-1.061 1.06l1.803 1.804L1.07 7.203l-.006.005a2.083 2.083 0 0 0 0 2.917l.006.005 3.466 3.467a2.038 2.038 0 0 0 2.928 0l5.733-5.733a.75.75 0 0 0 0-1.061L7.864 1.47a.75.75 0 0 0-1.061 0L5.667 2.606 3.864.803Zm1.803 3.924.47.47a.75.75 0 0 0 1.06-1.06l-.47-.47.606-.606 4.273 4.272-.583.584H2.477l3.19-3.19Zm-3.19 4.69h7.046l-3.12 3.12c-.24.24-.566.24-.806 0l-3.12-3.12Zm11.593 1.111a.75.75 0 0 0-1.474 0c-.059.314-.248.56-.58.99l-.018.024c-.302.392-.748.976-.748 1.791a2.083 2.083 0 1 0 4.167 0c0-.815-.446-1.4-.748-1.79l-.02-.026c-.33-.43-.52-.675-.578-.989Zm-1.32 2.805c0-.25.12-.467.436-.875l.072-.093c.024-.031.05-.063.075-.097l.075.096.073.094c.315.408.436.624.436.875a.583.583 0 0 1-1.167 0Z" clip-rule="evenodd"/></g><defs><clipPath id="a"><path fill="#fff" d="M0 0h16v16H0z"/></clipPath></defs></svg>`;
const columnsIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M2.11 2.11c.39-.39.92-.61 1.473-.61h9.334A2.083 2.083 0 0 1 15 3.583v9.334A2.083 2.083 0 0 1 12.917 15H3.583A2.083 2.083 0 0 1 1.5 12.917V3.583c0-.552.22-1.082.61-1.473ZM3.583 3A.583.583 0 0 0 3 3.583V5.5h2.5V3H3.583ZM7 3v2.5h6.5V3.583A.583.583 0 0 0 12.917 3H7Zm6.5 4H7v6.5h5.917a.583.583 0 0 0 .583-.583V7Zm-8 6.5V7H3v5.917a.583.583 0 0 0 .583.583H5.5Z" clip-rule="evenodd"/></svg>`;
const contractedIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M5.47 3.47a.75.75 0 0 1 1.06 0l4 4a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 0 1-1.06-1.06L8.94 8 5.47 4.53a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>`;
const copyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M2.5 3.083c0-.319.264-.583.583-.583H9.75c.32 0 .583.264.583.583a.75.75 0 0 0 1.5 0A2.087 2.087 0 0 0 9.75 1H3.083A2.087 2.087 0 0 0 1 3.083V9.75c0 1.148.936 2.083 2.083 2.083a.75.75 0 0 0 0-1.5.587.587 0 0 1-.583-.583V3.083Zm4 3.953c0-.296.24-.536.536-.536h6.428c.296 0 .536.24.536.536v6.428c0 .296-.24.536-.536.536H7.036a.536.536 0 0 1-.536-.536V7.036ZM7.036 5A2.036 2.036 0 0 0 5 7.036v6.428c0 1.125.911 2.036 2.036 2.036h6.428a2.036 2.036 0 0 0 2.036-2.036V7.036A2.036 2.036 0 0 0 13.464 5H7.036Z" clip-rule="evenodd"/></svg>`;
const crossIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M12.78 4.78a.75.75 0 0 0-1.06-1.06L8.25 7.19 4.78 3.72a.75.75 0 0 0-1.06 1.06l3.47 3.47-3.47 3.47a.75.75 0 1 0 1.06 1.06l3.47-3.47 3.47 3.47a.75.75 0 1 0 1.06-1.06L9.31 8.25l3.47-3.47Z" clip-rule="evenodd"/></svg>`;
const csvIcon = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2" viewBox="0 0 32 32"><path d="M384 131.9c-7.753-8.433-110.425-128.473-114.9-133L48-.1C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V131.9Zm-35.9 2.1H257V27.9L348.1 134ZM30 479V27h200l1 105c0 13.3-1.3 29 12 29h111l1 318H30Z" style="fill-rule:nonzero" transform="matrix(.06285 0 0 .06285 3.934 -.054)"/><path d="M.688-.226a.197.197 0 0 1-.017.074.277.277 0 0 1-.145.14.412.412 0 0 1-.234.013.283.283 0 0 1-.202-.168.468.468 0 0 1-.04-.19c0-.058.008-.109.025-.155a.319.319 0 0 1 .182-.191.355.355 0 0 1 .134-.025c.058 0 .11.012.155.035a.28.28 0 0 1 .104.085.17.17 0 0 1 .036.097.064.064 0 0 1-.018.044.055.055 0 0 1-.042.019.064.064 0 0 1-.042-.013.21.21 0 0 1-.031-.046.22.22 0 0 0-.066-.079.161.161 0 0 0-.095-.027.172.172 0 0 0-.142.068.304.304 0 0 0-.053.193.37.37 0 0 0 .023.139.18.18 0 0 0 .067.083.182.182 0 0 0 .1.027c.042 0 .077-.01.106-.031a.19.19 0 0 0 .065-.091.152.152 0 0 1 .023-.046C.59-.283.605-.289.625-.289a.06.06 0 0 1 .044.018.058.058 0 0 1 .019.045Z" style="fill-rule:nonzero" transform="matrix(8.39799 0 0 12.455 7.122 25.977)"/><path d="M.622-.215a.215.215 0 0 1-.033.117.233.233 0 0 1-.098.081.376.376 0 0 1-.153.029.34.34 0 0 1-.175-.04.233.233 0 0 1-.079-.077.169.169 0 0 1-.031-.093c0-.018.006-.033.019-.045a.059.059 0 0 1 .046-.019.06.06 0 0 1 .039.014.11.11 0 0 1 .027.044.251.251 0 0 0 .03.057c.01.015.025.028.044.038.02.01.045.015.076.015.043 0 .078-.01.105-.03a.09.09 0 0 0 .04-.075.078.078 0 0 0-.022-.058.136.136 0 0 0-.056-.034 1.007 1.007 0 0 0-.092-.025.698.698 0 0 1-.129-.042.21.21 0 0 1-.083-.066.173.173 0 0 1-.03-.104c0-.039.011-.074.032-.105a.209.209 0 0 1 .093-.07.374.374 0 0 1 .144-.025c.044 0 .082.005.114.016a.245.245 0 0 1 .08.044.183.183 0 0 1 .046.057c.01.02.015.039.015.058a.067.067 0 0 1-.018.046.06.06 0 0 1-.046.021C.51-.486.498-.49.489-.498a.169.169 0 0 1-.028-.041.186.186 0 0 0-.047-.063C.396-.617.367-.625.326-.625a.148.148 0 0 0-.09.025c-.023.016-.035.036-.035.059 0 .014.004.027.012.037a.096.096 0 0 0 .032.027.379.379 0 0 0 .111.036c.04.01.077.02.11.031.032.012.06.026.083.042a.17.17 0 0 1 .054.062.194.194 0 0 1 .019.091Z" style="fill-rule:nonzero" transform="matrix(8.39799 0 0 12.455 13.339 25.977)"/><path d="m.184-.633.162.48.163-.483c.008-.026.015-.043.019-.053a.062.062 0 0 1 .061-.039.067.067 0 0 1 .059.034c.006.01.009.02.009.031a.097.097 0 0 1-.003.023l-.007.025-.009.024-.173.468-.019.051a.206.206 0 0 1-.021.042.08.08 0 0 1-.033.03.094.094 0 0 1-.049.012.109.109 0 0 1-.05-.011A.108.108 0 0 1 .26-.03a.206.206 0 0 1-.021-.042L.22-.123.05-.587.041-.612a.198.198 0 0 1-.008-.026.13.13 0 0 1-.003-.024c0-.017.006-.032.02-.046a.069.069 0 0 1 .05-.02c.025 0 .042.008.053.023.01.015.02.039.031.072Z" style="fill-rule:nonzero" transform="matrix(8.39799 0 0 12.455 18.94 25.977)"/></svg>`;
const cutIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M3.5 2.25a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5ZM.75 3.5a2.75 2.75 0 1 1 5.152 1.34L8 6.94l4.803-4.804a.75.75 0 0 1 1.06 1.061L8.53 8.53l-2.628 2.63a2.75 2.75 0 1 1-1.06-1.06l2.097-2.1-2.098-2.098A2.75 2.75 0 0 1 .75 3.5Zm2.75 7.75a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm6.897-1.914a.75.75 0 0 0-1.06 1.061l3.466 3.467a.75.75 0 0 0 1.06-1.061l-3.466-3.467Z" clip-rule="evenodd"/></svg>`;
const descIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M8.497 3a.75.75 0 1 0-1.5 0v7.723L3.61 7.336a.75.75 0 0 0-1.06 1.061l4.666 4.667a.75.75 0 0 0 1.061 0l4.667-4.667a.75.75 0 1 0-1.061-1.06l-3.386 3.386V3Z" clip-rule="evenodd"/></svg>`;
const downIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M8.497 3a.75.75 0 1 0-1.5 0v7.723L3.61 7.336a.75.75 0 0 0-1.06 1.061l4.666 4.667a.75.75 0 0 0 1.061 0l4.667-4.667a.75.75 0 1 0-1.061-1.06l-3.386 3.386V3Z" clip-rule="evenodd"/></svg>`;
const excelIcon = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2" viewBox="0 0 32 32"><path d="M384 131.9c-7.753-8.433-110.425-128.473-114.9-133L48-.1C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V131.9Zm-35.9 2.1H257V27.9L348.1 134ZM30 479V27h200l1 105c0 13.3-1.3 29 12 29h111l1 318H30Z" style="fill-rule:nonzero" transform="matrix(.06285 0 0 .06285 3.934 -.054)"/><path d="m.052-.139.16-.234-.135-.208a.347.347 0 0 1-.028-.052.096.096 0 0 1-.01-.042.05.05 0 0 1 .018-.037.065.065 0 0 1 .045-.016c.02 0 .036.006.047.018a.493.493 0 0 1 .047.066l.107.174.115-.174.024-.038.019-.026a.137.137 0 0 1 .021-.015.076.076 0 0 1 .027-.005.06.06 0 0 1 .044.016.051.051 0 0 1 .018.039c0 .022-.013.052-.038.089l-.141.211.152.234a.3.3 0 0 1 .03.051.092.092 0 0 1 .009.038.062.062 0 0 1-.008.031.066.066 0 0 1-.024.023.074.074 0 0 1-.034.008.075.075 0 0 1-.035-.008.08.08 0 0 1-.023-.022L.427-.067.301-.265l-.134.204-.022.034a.146.146 0 0 1-.016.019.086.086 0 0 1-.022.015.09.09 0 0 1-.03.005.063.063 0 0 1-.044-.016.063.063 0 0 1-.017-.047c0-.024.012-.053.036-.088Z" style="fill-rule:nonzero" transform="matrix(17.82892 0 0 16.50777 10.371 25.928)"/></svg>`;
const expandedIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M10.53 3.47a.75.75 0 0 1 0 1.06L7.06 8l3.47 3.47a.75.75 0 1 1-1.06 1.06l-4-4a.75.75 0 0 1 0-1.06l4-4a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd"/></svg>`;
const eyeSlashIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><g fill="#000" fill-rule="evenodd" clip-path="url(#a)" clip-rule="evenodd"><path d="M7.999 2.583H8c2.61 0 4.461 1.312 5.633 2.573a10.338 10.338 0 0 1 1.61 2.308c.035.071.062.128.08.17l.023.048.007.015.002.004v.002c0 .001.001.002-.688.297l.689-.295a.75.75 0 0 1-.01.612 9.522 9.522 0 0 1-1.208 1.94.75.75 0 0 1-1.169-.94c.33-.41.619-.852.862-1.318a8.846 8.846 0 0 0-1.297-1.822C11.539 5.106 10.058 4.084 8 4.083c-.253 0-.505.017-.755.048a.75.75 0 0 1-.185-1.489c.31-.038.624-.058.938-.059Zm-.864 3.492a.75.75 0 0 1-.037 1.06 1.25 1.25 0 1 0 1.767 1.767.75.75 0 0 1 1.097 1.023 2.75 2.75 0 1 1-3.887-3.887.75.75 0 0 1 1.06.037ZM4.83 5.027a.75.75 0 0 0-.845-1.24A9.767 9.767 0 0 0 .655 7.679a.75.75 0 0 0-.011.616L1.334 8l-.69.296.001.003.002.004.007.015a3.779 3.779 0 0 0 .104.218c.07.142.176.34.316.577.28.47.707 1.1 1.293 1.73C3.54 12.106 5.39 13.417 8 13.418H8v-.75l-.002.75h.001a7.244 7.244 0 0 0 4.007-1.198.75.75 0 0 0-.826-1.252 5.743 5.743 0 0 1-3.178.95H8c-2.057 0-3.539-1.022-4.534-2.094a8.842 8.842 0 0 1-1.296-1.82A8.267 8.267 0 0 1 4.83 5.027Z"/><path d="M.803.803a.75.75 0 0 1 1.06 0l13.334 13.333a.75.75 0 0 1-1.06 1.061L.802 1.864a.75.75 0 0 1 0-1.061Z"/></g><defs><clipPath id="a"><path fill="#fff" d="M0 0h16v16H0z"/></clipPath></defs></svg>`;
const _eyeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M1.728 8.182c.185-.743.962-1.733 2.181-2.562C5.104 4.808 6.585 4.25 8 4.25s2.896.558 4.09 1.37c1.22.829 1.997 1.82 2.182 2.562a.75.75 0 0 0 1.456-.364c-.315-1.257-1.438-2.517-2.794-3.438-1.38-.938-3.15-1.63-4.934-1.63-1.785 0-3.554.692-4.934 1.63C1.71 5.3.586 6.56.272 7.818a.75.75 0 0 0 1.456.364ZM6.75 8a1.25 1.25 0 1 1 2.5 0 1.25 1.25 0 0 1-2.5 0ZM8 5.25a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5Z" clip-rule="evenodd"/><path fill="#000" fill-rule="evenodd" d="M12.09 10.38c1.22-.829 1.997-1.82 2.182-2.562a.75.75 0 0 1 1.456.364c-.315 1.257-1.438 2.517-2.794 3.438-1.38.938-3.15 1.63-4.934 1.63-1.785 0-3.554-.692-4.934-1.63C1.71 10.7.586 9.44.272 8.182a.75.75 0 1 1 1.456-.364c.185.743.962 1.733 2.181 2.562 1.195.812 2.676 1.37 4.091 1.37s2.896-.558 4.09-1.37Z" clip-rule="evenodd"/></svg>`;
const filterIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M1.25 3.75A.75.75 0 0 1 2 3h12a.75.75 0 0 1 0 1.5H2a.75.75 0 0 1-.75-.75Zm2.667 4a.75.75 0 0 1 .75-.75h6.666a.75.75 0 1 1 0 1.5H4.667a.75.75 0 0 1-.75-.75ZM6.667 11a.75.75 0 0 0 0 1.5h2.666a.75.75 0 0 0 0-1.5H6.667Z" clip-rule="evenodd"/></svg>`;
const firstIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M5.5 4A.75.75 0 0 0 4 4v8a.75.75 0 0 0 1.5 0V4Zm2.81 4 3.47-3.47a.75.75 0 0 0-1.06-1.06l-4 4a.75.75 0 0 0 0 1.06l4 4a.75.75 0 1 0 1.06-1.06L8.31 8Z" clip-rule="evenodd"/></svg>`;
const gripIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M4.75 5.5a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm4 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm2.75 1.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM4.75 9.5a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm2.75 1.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm5.25-1.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" clip-rule="evenodd"/></svg>`;
const groupIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M10.947 2.89a.75.75 0 0 1 0 1.06l-.053.053h1.523A2.083 2.083 0 0 1 14.5 6.087v6.666a.75.75 0 0 1-1.5 0V6.087a.583.583 0 0 0-.583-.584h-1.523l.053.053a.75.75 0 1 1-1.06 1.061L8.552 5.284a.75.75 0 0 1 0-1.061L9.886 2.89a.75.75 0 0 1 1.061 0ZM1.75 4.003a.75.75 0 0 0 0 1.5h4.667a.75.75 0 1 0 0-1.5H1.75ZM1 8.753a.75.75 0 0 1 .75-.75h8.667a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1-.75-.75Zm0 4a.75.75 0 0 1 .75-.75h8.667a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd"/></svg>`;
const lastIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M11.75 12.75a.75.75 0 0 0 .75-.75V4A.75.75 0 0 0 11 4v8c0 .414.336.75.75.75ZM5.78 3.47a.75.75 0 0 0-1.06 1.06L8.19 8l-3.47 3.47a.75.75 0 1 0 1.06 1.06l4-4a.75.75 0 0 0 0-1.06l-4-4Z" clip-rule="evenodd"/></svg>`;
const leftIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M9.03 3.28a.75.75 0 0 0-1.06-1.06L3.172 7.017a.75.75 0 0 0 0 1.466L7.97 13.28a.75.75 0 0 0 1.06-1.06L5.31 8.5h7.357a.75.75 0 0 0 0-1.5H5.31l3.72-3.72Z" clip-rule="evenodd"/></svg>`;
const linkedIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M11.65 10c.553 0 1.09-.229 1.491-.648.403-.42.634-.995.634-1.602 0-.607-.231-1.183-.634-1.602A2.066 2.066 0 0 0 11.65 5.5H10.5a.75.75 0 0 1 0-1.5h1.15c.972 0 1.897.403 2.574 1.11a3.817 3.817 0 0 1 1.051 2.64c0 .985-.375 1.935-1.05 2.64a3.565 3.565 0 0 1-2.575 1.11H10.5a.75.75 0 0 1 0-1.5h1.15ZM4.375 5.5c-.553 0-1.09.229-1.491.648-.403.42-.634.995-.634 1.602 0 .607.231 1.183.634 1.602.4.42.938.648 1.491.648h1.15a.75.75 0 0 1 0 1.5h-1.15a3.566 3.566 0 0 1-2.574-1.11A3.818 3.818 0 0 1 .75 7.75c0-.985.375-1.935 1.05-2.64A3.565 3.565 0 0 1 4.376 4h1.15a.75.75 0 0 1 0 1.5h-1.15ZM5.333 7a.75.75 0 1 0 0 1.5h5.334a.75.75 0 0 0 0-1.5H5.333Z" clip-rule="evenodd"/></svg>`;
const loadingIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><g clip-path="url(#a)"><path fill="#000" fill-rule="evenodd" d="M8.997 1.58a.75.75 0 1 0-1.5 0v2.667a.75.75 0 0 0 1.5 0V1.58Zm0 10.667a.75.75 0 0 0-1.5 0v2.666a.75.75 0 1 0 1.5 0v-2.666ZM3.003 3.003a.75.75 0 0 1 1.06 0L5.95 4.89a.75.75 0 0 1-1.06 1.06L3.003 4.064a.75.75 0 0 1 0-1.061Zm8.6 7.54a.75.75 0 0 0-1.06 1.06l1.887 1.887a.75.75 0 1 0 1.06-1.06l-1.886-1.887ZM.83 8.247a.75.75 0 0 1 .75-.75h2.667a.75.75 0 0 1 0 1.5H1.58a.75.75 0 0 1-.75-.75Zm11.417-.75a.75.75 0 0 0 0 1.5h2.666a.75.75 0 1 0 0-1.5h-2.666ZM5.95 10.543a.75.75 0 0 1 0 1.06L4.064 13.49a.75.75 0 0 1-1.061-1.06l1.887-1.887a.75.75 0 0 1 1.06 0Zm7.54-6.48a.75.75 0 0 0-1.06-1.06L10.543 4.89a.75.75 0 1 0 1.06 1.06l1.887-1.886Z" clip-rule="evenodd"/></g><defs><clipPath id="a"><path fill="#fff" d="M0 0h16v16H0z"/></clipPath></defs></svg>`;
const maximizeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M10.75 1a.75.75 0 0 0 0 1.5h2.19L9.052 6.386a.75.75 0 1 0 1.06 1.061L14 3.561V5.75a.75.75 0 0 0 1.5 0v-4a.75.75 0 0 0-.75-.75h-4ZM2.5 10.75a.75.75 0 0 0-1.5 0v4c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5H3.56l3.887-3.886a.75.75 0 0 0-1.06-1.061L2.5 12.939V10.75Z" clip-rule="evenodd"/></svg>`;
const menuIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;">
    <g transform="matrix(0.826045,0,0,0.826045,1.39166,1.39166)">
        <circle cx="8" cy="8" r="1.816" fill="#000"/>
    </g>
    <g transform="matrix(0.826045,0,0,0.826045,1.39166,-4.10834)">
        <circle cx="8" cy="8" r="1.816" fill="#000"/>
    </g>
    <g transform="matrix(0.826045,0,0,0.826045,1.39166,6.89166)">
        <circle cx="8" cy="8" r="1.816" fill="#000"/>
    </g>
</svg>`;
const minimizeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M15.28 1.22a.75.75 0 0 1 0 1.06L11.56 6h2.19a.75.75 0 0 1 0 1.5h-4A.75.75 0 0 1 9 6.75v-4a.75.75 0 0 1 1.5 0v2.19l3.72-3.72a.75.75 0 0 1 1.06 0ZM2.75 9a.75.75 0 0 0 0 1.5h2.19l-3.72 3.72a.75.75 0 1 0 1.06 1.06L6 11.56v2.19a.75.75 0 0 0 1.5 0v-4A.75.75 0 0 0 6.75 9h-4Z" clip-rule="evenodd"/></svg>`;
const minusIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><g clip-path="url(#a)"><path fill="#000" fill-rule="evenodd" d="M1.5 7.75a6.25 6.25 0 1 1 12.5 0 6.25 6.25 0 0 1-12.5 0ZM7.75 0a7.75 7.75 0 1 0 0 15.5 7.75 7.75 0 0 0 0-15.5Zm-2.5 7a.75.75 0 0 0 0 1.5h5a.75.75 0 0 0 0-1.5h-5Z" clip-rule="evenodd"/></g><defs><clipPath id="a"><path fill="#fff" d="M0 0h16v16H0z"/></clipPath></defs></svg>`;
const nextIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M5.47 3.47a.75.75 0 0 1 1.06 0l4 4a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 0 1-1.06-1.06L8.94 8 5.47 4.53a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>`;
const noneIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M8.53 1.47a.75.75 0 0 0-1.06 0L4.136 4.803a.75.75 0 0 0 1.061 1.06L8 3.062l2.803 2.803a.75.75 0 0 0 1.06-1.061L8.53 1.47Zm-3.333 8.67a.75.75 0 1 0-1.06 1.06l3.333 3.334a.75.75 0 0 0 1.06 0l3.334-3.334a.75.75 0 1 0-1.061-1.06L8 12.943 5.197 10.14Z" clip-rule="evenodd"/></svg>`;
const notAllowedIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="m3.928 2.867.53.53 8.05 8.05.53.531-1.06 1.06-.53-.53-8.05-8.05-.53-.53 1.06-1.06Z" clip-rule="evenodd"/><path fill="#000" fill-rule="evenodd" d="M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Z" clip-rule="evenodd"/></svg>`;
const pasteIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M5.625.5a1.375 1.375 0 0 0-1.37 1.25h-.422A2.083 2.083 0 0 0 1.75 3.833v9.334a2.083 2.083 0 0 0 2.083 2.083h8a2.083 2.083 0 0 0 2.084-2.083.75.75 0 0 0-1.5 0 .583.583 0 0 1-.584.583h-8a.583.583 0 0 1-.583-.583V3.833a.583.583 0 0 1 .583-.583h.422c.026.315.149.62.387.858.268.27.625.392.983.392h3.75c.358 0 .714-.123.983-.392.238-.237.361-.543.387-.858h1.088a.583.583 0 0 1 .584.583v1.334a.75.75 0 0 0 1.5 0V3.833a2.083 2.083 0 0 0-2.084-2.083h-1.088a1.355 1.355 0 0 0-.386-.858A1.374 1.374 0 0 0 9.375.5h-3.75ZM9.25 3h-3.5V2h3.5v1ZM6.417 9.5a.75.75 0 0 1 .75-.75h4.687L10.47 7.365a.75.75 0 0 1 1.06-1.06l2.667 2.666a.75.75 0 0 1 0 1.061l-2.667 2.667a.75.75 0 1 1-1.06-1.061l1.388-1.388H7.167a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd"/></svg>`;
const pinIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M3.777 1.61c.39-.39.92-.61 1.473-.61h5.333a2.083 2.083 0 0 1 .084 4.165V7.59a.584.584 0 0 0 .323.522l.005.002 1.185.599a2.083 2.083 0 0 1 1.153 1.863v1.174a.75.75 0 0 1-.75.75H3.25a.75.75 0 0 1-.75-.75v-1.173a2.083 2.083 0 0 1 1.154-1.864l1.184-.599.005-.002a.583.583 0 0 0 .324-.522V5.165a2.083 2.083 0 0 1-1.39-3.555Zm1.473.89a.583.583 0 0 0 0 1.167h.667a.75.75 0 0 1 .75.75V7.59a2.083 2.083 0 0 1-1.154 1.864l-1.185.599-.004.002a.583.583 0 0 0-.324.522V11h7.833v-.423a.583.583 0 0 0-.323-.522l-.005-.002-1.185-.6A2.083 2.083 0 0 1 9.167 7.59V4.417a.75.75 0 0 1 .75-.75h.666a.583.583 0 0 0 0-1.167H5.25Z" clip-rule="evenodd"/><path fill="#000" fill-rule="evenodd" d="M8 10.75a.75.75 0 0 1 .75.75v3.333a.75.75 0 0 1-1.5 0V11.5a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd"/></svg>`;
const pivotIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M3.083 2.5a.583.583 0 0 0-.583.583v9.334c0 .322.261.583.583.583h9.334a.583.583 0 0 0 .583-.583V3.083a.583.583 0 0 0-.583-.583H3.083ZM1 3.083C1 1.933 1.933 1 3.083 1h9.334c1.15 0 2.083.933 2.083 2.083v9.334c0 1.15-.933 2.083-2.083 2.083H3.083A2.083 2.083 0 0 1 1 12.417V3.083Z" clip-rule="evenodd"/><path fill="#000" fill-rule="evenodd" d="M9.75 1a.75.75 0 0 1 .75.75V5h3.25a.75.75 0 0 1 0 1.5H10.5V9h3.25a.75.75 0 0 1 0 1.5H10.5v3.25a.75.75 0 0 1-1.5 0V10.5H1.75a.75.75 0 0 1 0-1.5H9V6.5H1.75a.75.75 0 0 1 0-1.5H9V1.75A.75.75 0 0 1 9.75 1Z" clip-rule="evenodd"/></svg>`;
const plusIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><g clip-path="url(#a)"><path fill="#000" fill-rule="evenodd" d="M7.75 1.5a6.25 6.25 0 1 0 0 12.5 6.25 6.25 0 0 0 0-12.5ZM0 7.75a7.75 7.75 0 1 1 15.5 0 7.75 7.75 0 0 1-15.5 0ZM7.75 4.5a.75.75 0 0 1 .75.75V7h1.75a.75.75 0 0 1 0 1.5H8.5v1.75a.75.75 0 0 1-1.5 0V8.5H5.25a.75.75 0 0 1 0-1.5H7V5.25a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd"/></g><defs><clipPath id="a"><path fill="#fff" d="M0 0h16v16H0z"/></clipPath></defs></svg>`;
const previousIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M10.53 3.47a.75.75 0 0 1 0 1.06L7.06 8l3.47 3.47a.75.75 0 1 1-1.06 1.06l-4-4a.75.75 0 0 1 0-1.06l4-4a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd"/></svg>`;
const _radioButtonOffIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="black"><path d="M7.467.017a8.028 8.028 0 0 0-5.859 3.176C.799 4.26.296 5.477.073 6.906c-.082.523-.082 1.665 0 2.188.342 2.194 1.403 3.995 3.122 5.299 1.062.806 2.286 1.312 3.711 1.534.523.082 1.665.082 2.188 0 1.944-.303 3.596-1.179 4.836-2.565 1.1-1.229 1.735-2.587 1.997-4.268.082-.523.082-1.665 0-2.188-.222-1.425-.728-2.649-1.534-3.711A7.994 7.994 0 0 0 9 .066 12.585 12.585 0 0 0 7.467.017M9.04 1.078c2.791.433 5.064 2.493 5.741 5.203.161.643.192.923.192 1.719 0 .555-.011.775-.049 1.027a7.016 7.016 0 0 1-5.487 5.823c-.889.19-1.985.19-2.874 0-2.611-.556-4.687-2.542-5.336-5.103-.168-.664-.2-.94-.2-1.747 0-.807.032-1.083.2-1.747a7.006 7.006 0 0 1 5.026-5.026c.22-.056.544-.121.72-.144l.4-.054c.201-.027 1.401.008 1.667.049"/></svg>`;
const _radioButtonOnIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="black"><path d="M7.467.017a8.028 8.028 0 0 0-5.859 3.176C.799 4.26.296 5.477.073 6.906c-.082.523-.082 1.665 0 2.188.342 2.194 1.403 3.995 3.122 5.299 1.062.806 2.286 1.312 3.711 1.534.523.082 1.665.082 2.188 0 1.944-.303 3.596-1.179 4.836-2.565 1.1-1.229 1.735-2.587 1.997-4.268.082-.523.082-1.665 0-2.188-.222-1.425-.728-2.649-1.534-3.711A7.994 7.994 0 0 0 9 .066 12.585 12.585 0 0 0 7.467.017m1.07 5.035a3.023 3.023 0 0 1 2.411 2.411c.08.459.037 1.072-.103 1.484a3 3 0 0 1-5.69 0c-.191-.56-.19-1.335.002-1.898.143-.419.417-.862.724-1.168a3.11 3.11 0 0 1 1.568-.828 4.17 4.17 0 0 1 1.088-.001"/></svg>`;
const rightIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M6.97 12.22a.75.75 0 1 0 1.06 1.06l4.798-4.797a.75.75 0 0 0 0-1.466L8.03 2.22a.75.75 0 0 0-1.06 1.06L10.69 7H3.332a.75.75 0 0 0 0 1.5h7.356l-3.72 3.72Z" clip-rule="evenodd"/></svg>`;
const saveIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M7.747 1a.75.75 0 0 1 .75.75v7.523l2.72-2.72a.75.75 0 0 1 1.06 1.06l-3.999 4-.014.014a.748.748 0 0 1-1.034 0l-.015-.015-3.999-3.998a.75.75 0 0 1 1.061-1.061l2.72 2.72V1.75a.75.75 0 0 1 .75-.75ZM3.08 13a.75.75 0 0 0 0 1.5h9.333a.75.75 0 0 0 0-1.5H3.08Z" clip-rule="evenodd"/></svg>`;
const smallDownIcon = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2" viewBox="0 0 32 32"><path d="M7.334 10.667 16 21.334l8.667-10.667H7.334Z" style="fill-rule:nonzero"/></svg>`;
const smallLeftIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M10.354 3.646a.5.5 0 0 1 0 .708L6.707 8l3.647 3.646a.5.5 0 0 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 0 1 .708 0Z" clip-rule="evenodd"/></svg>`;
const smallRightIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M5.646 3.646a.5.5 0 0 1 .708 0l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L9.293 8 5.646 4.354a.5.5 0 0 1 0-.708Z" clip-rule="evenodd"/></svg>`;
const smallUpIcon = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2" viewBox="0 0 32 32"><path d="M7.334 21.333 16 10.666l8.667 10.667H7.334Z" style="fill-rule:nonzero"/></svg>`;
const tickIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M13.864 3.47a.75.75 0 0 1 0 1.06L6.53 11.864a.75.75 0 0 1-1.06 0L2.136 8.53a.75.75 0 0 1 1.061-1.06L6 10.273l6.803-6.803a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd"/></svg>`;
const treeClosedIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M5.47 12.53a.75.75 0 0 1 0-1.06L8.94 8 5.47 4.53a.75.75 0 0 1 1.06-1.06l4 4a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 0 1-1.06 0Z" clip-rule="evenodd"/></svg>`;
const treeIndeterminateIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M2.583 7.75a.75.75 0 0 1 .75-.75h9.334a.75.75 0 0 1 0 1.5H3.333a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd"/></svg>`;
const treeOpenIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M3.47 5.47a.75.75 0 0 1 1.06 0L8 8.94l3.47-3.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>`;
const unlinkedIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M4.03 2.22a.75.75 0 0 0-1.06 1.06L6.69 7H4.332a.75.75 0 1 0 0 1.5h3.334a.747.747 0 0 0 .404-.118l5.899 5.898a.75.75 0 1 0 1.06-1.06l-11-11Zm9.111 7.132a.75.75 0 1 0 1.083 1.038 3.817 3.817 0 0 0 1.051-2.64c0-.985-.375-1.935-1.05-2.64A3.565 3.565 0 0 0 11.65 4H10.5a.75.75 0 0 0 0 1.5h1.15c.553 0 1.09.229 1.491.648.403.42.634.995.634 1.602 0 .607-.231 1.183-.634 1.602ZM2.884 6.148A.75.75 0 0 0 1.8 5.11 3.817 3.817 0 0 0 .75 7.75c0 .985.375 1.935 1.05 2.64a3.566 3.566 0 0 0 2.575 1.11h1.15a.75.75 0 0 0 0-1.5h-1.15c-.553 0-1.09-.229-1.491-.648A2.318 2.318 0 0 1 2.25 7.75c0-.607.231-1.183.634-1.602Z" clip-rule="evenodd"/></svg>`;
const upIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"><path fill="#000" fill-rule="evenodd" d="M8.483 3.172a.75.75 0 0 0-1.466 0L2.72 7.47a.75.75 0 0 0 1.06 1.06L7 5.31v7.357a.75.75 0 0 0 1.5 0V5.31l3.22 3.22a.75.75 0 1 0 1.06-1.061L8.483 3.172Z" clip-rule="evenodd"/></svg>`;

export const agGridIconSet = {
	// Column group icons
	columnGroupOpened: expandedIcon,
	columnGroupClosed: contractedIcon,

	// Column tool panel icons
	columnSelectClosed: treeClosedIcon,
	columnSelectOpen: treeOpenIcon,
	columnSelectIndeterminate: treeIndeterminateIcon,

	// Accordion icons
	accordionOpen: treeOpenIcon,
	accordionClosed: treeClosedIcon,
	accordionIndeterminate: treeIndeterminateIcon,

	// Column move icons
	columnMovePin: pinIcon,
	columnMoveHide: eyeSlashIcon,
	columnMoveMove: arrowsIcon,
	columnMoveLeft: leftIcon,
	columnMoveRight: rightIcon,
	columnMoveGroup: groupIcon,
	columnMoveValue: aggregationIcon,
	columnMovePivot: pivotIcon,

	// Drop zone icons
	dropNotAllowed: notAllowedIcon,

	// Row group icons
	groupContracted: treeClosedIcon,
	groupExpanded: treeOpenIcon,

	// Set filter icons
	setFilterGroupClosed: treeClosedIcon,
	setFilterGroupOpen: treeOpenIcon,
	setFilterGroupIndeterminate: treeIndeterminateIcon,
	setFilterLoading: loadingIcon,

	// General UI icons
	chart: chartIcon,
	close: crossIcon,
	cancel: cancelIcon,
	check: tickIcon,

	// Pagination icons
	first: firstIcon,
	previous: previousIcon,
	next: nextIcon,
	last: lastIcon,

	// Chart linking icons
	linked: linkedIcon,
	unlinked: unlinkedIcon,

	// Loading icon
	groupLoading: loadingIcon,

	// Menu icons
	menu: menuIcon,
	menuAlt: menuIcon,
	legacyMenu: menuIcon,

	// Filter icons
	filter: filterIcon,
	filterActive: filterIcon,
	filterAdd: plusIcon,
	filterCardCollapse: smallUpIcon,
	filterCardExpand: smallDownIcon,
	filterCardEditing: crossIcon,
	filterTab: filterIcon,
	filtersToolPanel: filterIcon,

	// Column icons
	columns: columnsIcon,
	columnsToolPanel: columnsIcon,

	// Window control icons
	maximize: maximizeIcon,
	minimize: minimizeIcon,

	// Menu items
	menuPin: pinIcon,
	menuValue: aggregationIcon,
	menuAddRowGroup: groupIcon,
	menuRemoveRowGroup: groupIcon,

	// Clipboard icons
	clipboardCopy: copyIcon,
	clipboardCut: cutIcon,
	clipboardPaste: pasteIcon,

	// Panel icons
	pivotPanel: pivotIcon,
	rowGroupPanel: groupIcon,
	valuePanel: aggregationIcon,

	// Drag icons
	columnDrag: gripIcon,
	rowDrag: gripIcon,

	// Export icons
	save: saveIcon,
	csvExport: csvIcon,
	excelExport: excelIcon,

	// Select icons
	selectOpen: smallDownIcon,
	richSelectOpen: smallDownIcon,
	richSelectRemove: cancelIcon,

	// Sub menu icons
	subMenuOpen: smallRightIcon,
	subMenuOpenRtl: smallLeftIcon,
	panelDelimiter: smallRightIcon,
	panelDelimiterRtl: smallLeftIcon,

	// Sort icons
	sortAscending: ascIcon,
	sortDescending: descIcon,
	sortUnSort: noneIcon,

	// Advanced Filter icons
	advancedFilterBuilder: groupIcon,
	advancedFilterBuilderDrag: gripIcon,
	advancedFilterBuilderDragHandle: menuIcon,
	advancedFilterBuilderInvalid: notAllowedIcon,
	advancedFilterBuilderMoveUp: upIcon,
	advancedFilterBuilderMoveDown: downIcon,
	advancedFilterBuilderAdd: plusIcon,
	advancedFilterBuilderRemove: minusIcon,
	advancedFilterBuilderSelect: smallDownIcon,

	// Charts icons
	chartsMenu: menuIcon,
	chartsMenuEdit: chartIcon,
	chartsMenuAdvancedSettings: menuIcon,
	chartsMenuAdd: plusIcon,
	chartsColorPicker: smallDownIcon,
	chartsThemePrevious: previousIcon,
	chartsThemeNext: nextIcon,
	chartsDownload: saveIcon,
};
