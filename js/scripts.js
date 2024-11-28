
class CVTerminal {
  terminal;
  isAnimating;
  command;
  addons;
  addonsConfig;
  prompt;
  promptLength;
  cursorX;
  printingFullCV;
  interrupted;
  commands;
  cvSections;
  cv;
  currentSectionIndex;
  animationFrameId;

  constructor(config) {
    this.config = config;
    this.initializeProperties();
    this.installAddons();
    this.openTerminal(this.config.container);
    this.fitTerminal();
    this.registerEvents();
    this.writeWelcomeMessage();
  }

  fitTerminal() {
    const fitAddon = this.addons["FitAddon"];
    fitAddon && fitAddon.fit();
  }

  openTerminal(container) {
    this.terminal.open(container);
    this.terminal.focus();
  }

  writeWelcomeMessage() {
    // this.terminal.writeln("Hello There...");
    this.terminal.writeln("Type 'help' to see available commands.");
    this.writePrompt();
  }

  initializeProperties() {
    this.terminal = new Terminal(this.config.terminal);
    this.isAnimating = false;
    this.command = "";
    this.addons = {};
    this.addonsConfig = this.config.addons;
    this.prompt = this.config.cv.prompt;
    this.promptLength = this.prompt.length;
    this.cursorX = this.promptLength;
    this.printingFullCV = false;
    this.interrupted = false;
    this.commands = new Set(this.config.cv.commands);
    this.cvSections = new Set(this.config.cv.cvSections);
    this.cv = this.config.cv.cv;
    this.currentSectionIndex = 0;
    this.animationFrameId = -1;
  }

  installAddons() {
    this.addons = {};
    for (const addon of this.addonsConfig) {
      const addonConstructor = Object.values(addon.instance)[0];
      const addonInstance = new addonConstructor();
      this.addons[addon.instance.name] = addonInstance;
      this.terminal.loadAddon(addonInstance);
      if (addon.autoFit) {
        addonInstance.fit();
      }
    }
  }

  registerEvents() {
    this.terminal.onKeyPress((event) => this.handleKeyEvent(event));
    window.addEventListener("resize", () => this.fitTerminal());

    document.addEventListener("click", (event) => {
      const isTerminalClick = event.composedPath().some((el) => el === this.terminal.element);
      if (isTerminalClick) {
        this.terminal.focus();
      } else if (!isTerminalClick) {
        this.terminal.focus();
      }
    });
    document.addEventListener("touchstart", (event) => {
      const isTerminalClick = event.composedPath().some((el) => el === this.terminal.element);
      if (isTerminalClick) {
        this.terminal.focus();
      } else if (!isTerminalClick) {
        this.terminal.focus();
      }
    });
  }

  handleKeyEvent({ key, domEvent }) {
    const isCtrlC = domEvent.ctrlKey && domEvent.key.toLowerCase() === "c";
    const isPrintable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

    const KEYCODE = {
      Backspace: "Backspace",
      Enter: "Enter",
      ArrowUp: "ArrowUp",
      ArrowDown: "ArrowDown",
      ArrowLeft: "ArrowLeft",
      ArrowRight: "ArrowRight",
    };

    if (this.isAnimating && isCtrlC) {
      return this.interruptAnimation();
    }
    if (this.isAnimating) return;

    switch (domEvent.key) {
      case KEYCODE.Backspace:
        this.handleBackspace();
        break;
      case KEYCODE.Enter:
        this.handleReturn();
        break;
      case KEYCODE.ArrowUp:
      case KEYCODE.ArrowDown:
      case KEYCODE.ArrowLeft:
      case KEYCODE.ArrowRight:
        break;
      default:
        if (isPrintable) {
          this.handleInput(key);
        }
    }
  }

  stopAnimation() {
    this.interrupted = false;
    this.isAnimating = false;
    cancelAnimationFrame(this.animationFrameId);
    this.resetFullCV();
  }

  handleBackspace() {
    if (this.cursorX > this.promptLength) {
      this.terminal.write("\b \b");
      this.cursorX--;
    }
  }

  handleReturn() {
    this.terminal.writeln("");
    this.handleCommand();
    this.command = "";
    this.cursorX = this.promptLength;
    if (!this.isAnimating) {
      this.writePrompt();
    }
  }

  handleInput(key) {
  //  this.terminal.write(key);
    this.command += key;
    this.cursorX++;
  }

  writePrompt() {
    this.terminal.write(this.prompt);
  }

  handleCommand() {
    const trimmedCommand = this.command.trim();

    if (this.commands.has(trimmedCommand)) {
      switch (trimmedCommand) {
        case "fullcv":
          this.startFullCV();
          break;
        default:
          this.writeSection(trimmedCommand);
      }
    } else {
      this.terminal.writeln(" ERROR: Command not recognized: " + trimmedCommand + "!");
      this.terminal.writeln("Type 'help' to see available commands.");
    }
  }

//  writeHelp() {
//    let helpText = "\n  AVAILABLE COMMANDS:\n\n";
//    for (const cmd of this.commands) {
//      helpText += "- " + cmd + "\n";
//    }

//    this.isAnimating = true;
//    this.animateTyping(helpText, 0, () => {
//      this.isAnimating = false;
//      this.writePrompt();
//    });
//  }

  startFullCV() {
    this.printingFullCV = true;
    this.handleFullCVCommand();
  }

  writeSection(sectionName) {
    const section = "\n  " + sectionName.toUpperCase();
    this.terminal.writeln(section);
    const commandInfo = "\r\n" + this.cv[sectionName].join('\n');

    if (this.interrupted) return;

    this.isAnimating = true;
    this.animateTyping(commandInfo, 0, () => {
      this.isAnimating = false;
      if (this.printingFullCV) {
        this.handleFullCVCommand();
      } else {
        this.writePrompt();
      }
    });
  }

  handleFullCVCommand() {
    const cvSectionsArray = Array.from(this.cvSections);

    if (this.currentSectionIndex >= cvSectionsArray.length) {
      this.resetFullCV();
      this.writePrompt();
    } else {
      this.printingFullCV = true;
      const command = cvSectionsArray[this.currentSectionIndex];
      this.currentSectionIndex++;
      this.writeSection(command);
    }
  }

  resetFullCV() {
    this.currentSectionIndex = 0;
    this.printingFullCV = false;
  }

  animateTyping(text, pos, callback) {
    if (this.interrupted) {
      return this.stopAnimation();
    }

    if (pos < text.length) {
      this.terminal.write(text.charAt(pos));
      if (text.charAt(pos) === "\n") {
        this.terminal.write("\r");
      }
      this.animationFrameId = requestAnimationFrame(() =>
        this.animateTyping(text, pos + 1, callback)
      );
    } else {
      this.terminal.writeln("\r");
      this.isAnimating = false;
      callback && callback();
    }
  }

  interruptAnimation() {
    this.stopAnimation();
    this.terminal.write("\r\n\nInterrupted\r\n\n");
    this.writePrompt();
  }
}

// Initialize the terminal 
window.onload = () => {

  const addonsConfig = [
    { instance: FitAddon, autoFit: true },
    { instance: WebLinksAddon },
  ];

  
  const terminalSettings = {
    "fontSize": 9,
    "fontFamily": "'VT323', monospace", // Make sure 'VT323' is loaded as shown earlier
    "cursorStyle": "block",
    "cursorBlink": true,
    "theme": {
      "background": "#000000",
      "foreground": "#00ff00",
      "cursor": "#00ff00"
    },
    "cols": 50,
    "rows": 22
  };


  const cvInteraction = {
    "commands": [
      "about",
      "experience",
      "projects",
      "education",
      "certifications",
      "contact",
      "help"
    ],
    "cvSections": [
      "Zane about",
      "Zane's experience",
      "Zane's projects",
      "Zane's education",
      "certifications",
      "contact"
    ],
    "cv": {
      "about": [
        "Name: Zane Pearton"
        
      ],
      "experience": [
        "Data Engineer"
      ],

      "education": [
        "RMIT  Masters in Architecture",
        "RMIT  Bachelor's in Architecture",
        "Cert  IV Cybersecturity"
      ],
      "certifications": [
        "PCEP Certified Entry Level Python Programmer"
    ],

      "contact": [
        "LinkedIn: https://www.linkedin.com/in/zanepearton",
        "GitHub: ZanePearton",
        "Linktree: https://linktr.ee/zanepearton"
      ]
    },
    "prompt": "root > "
  };


  const terminalConfigurations = {
    terminal: terminalSettings,
    cv: cvInteraction,
    addons: addonsConfig,
    container: document.querySelector("#terminal"),
  };

  new CVTerminal(terminalConfigurations);
}
