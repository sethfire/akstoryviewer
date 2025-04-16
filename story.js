const gameState = {
    lines: [],
    currentLine: 0,

    background: null,
    blockerElement: null,

    dialogContainer: null,
    dialogSpeaker: null,
    dialogText: null,
    dialogTop: null,
    subtitle: null,

    isTyping: false,
    typingTimeout: null,
    currentText: "",
    currentTextElement: null,
    typingIndex: 0,

    isWaitingForInput: false,
    isLocked: false,

    storyReviewTable: null,
    storyVariables: null,

    characterLeftElement: null,
    characterMiddleElement: null,
    characterRightElement: null,
};

const gameEngine = {
    start(lines, storyVariables) {

        gameState.background = document.getElementById("background");
        gameState.blockerElement = document.getElementById("blocker");
    
        gameState.dialogContainer = document.getElementById('dialog-container');
        gameState.dialogSpeaker = document.getElementById('dialog-speaker');
        gameState.dialogText = document.getElementById('dialog-text');
        gameState.dialogTop = document.getElementById('dialog-top');
        gameState.subtitle = document.getElementById('subtitle');
        
        gameState.characterLeftElement = document.getElementById('character-left');
        gameState.characterMiddleElement = document.getElementById('character-middle');
        gameState.characterRightElement = document.getElementById('character-right');

        // gameState.sceneName = document.getElementById('scene-name');

        gameState.storyVariables = storyVariables;
    
        gameState.lines = lines;
        gameState.currentLine = 0;

        gameState.background.style.backgroundImage = "url('')";
        gameState.dialogSpeaker.textContent = "";
        gameState.dialogText.innerHTML = "";

        // Waiting for user input after dialog
        gameState.isWaitingForInput = false;

        // Do not accept any user input while true
        gameState.isLocked = false;

        // A forced wait has been triggered by the game
        gameState.isWaiting = false;
        gameState.waitDuration = 0;

        this.nextLine();
    },
  
    nextLine() {
        const entry = gameState.lines[gameState.currentLine++];
        if (!entry) return;

        renderLine(entry);

        if (gameState.isWaiting) {
            setTimeout(() => {
                gameState.isWaiting = false;
                gameState.waitDuration = 0;
                gameState.isLocked = false;
                this.nextLine();
            }, gameState.waitDuration * 1000);
        } else {
            if (!gameState.isWaitingForInput) {
                setTimeout(() => this.nextLine(), 0);
            }
        }
    },

    userAction() {
        if (gameState.isTyping) {

            clearTimeout(gameState.typingTimeout);
            gameState.dialogText.innerHTML = gameState.currentText;
            gameState.isTyping = false;

        }
        else if (gameState.isWaitingForInput && !gameState.isLocked){
            gameState.isWaitingForInput = false;
            this.nextLine();
        }
    },

    reset() {
        console.log("Resetting game state...");

        if (gameState.music) {
            gameState.music.pause();
            gameState.music = null;
        }

        if (gameState.background) {
            gameState.background.style.backgroundImage = "url('')";
        }

        if (gameState.blockerElement) {
            gameState.blockerElement.style.transition = "";
            gameState.blockerElement.style.backgroundColor = "rgba(0,0,0,0)";
        }

        if (gameState.dialogSpeaker) {
            gameState.dialogSpeaker.textContent = "";
        }

        if (gameState.dialogText) {
            gameState.dialogText.innerHTML = "";
        }
        
        if (gameState.characterLeftElement) {
            gameState.characterLeftElement.innerHTML = "";
            gameState.characterLeftElement.classList.remove("dimmed");
        }

        if (gameState.characterMiddleElement) {
            gameState.characterMiddleElement.innerHTML = "";
            gameState.characterMiddleElement.classList.remove("dimmed");
        }

        if (gameState.characterRightElement) {
            gameState.characterRightElement.innerHTML = "";
            gameState.characterRightElement.classList.remove("dimmed");
        }
        
        gameState.lines = [];
        gameState.currentLine = 0;

        gameState.currentText = "";
        gameState.textSpeed = 35;
        gameState.typingTimeout = null;
        gameState.isTyping = false;

        gameState.isWaitingForInput = false;
        gameState.isLocked = false;
        gameState.isWaiting = false;
        gameState.waitDuration = 0;

        // If you maintain sceneName or storyVariables, clear or reinit as needed
        gameState.storyVariables = null;
    }
};


function textWriter(element, text, speed = 35, callback = null) {
    element.innerHTML = "";
    gameState.currentText = text;
    gameState.currentTextElement = element;
    gameState.typingIndex = 0;
    gameState.isTyping = true;

    function type() {
        if (gameState.typingIndex < gameState.currentText.length) {
            gameState.currentTextElement.innerHTML += gameState.currentText.charAt(gameState.typingIndex);
            gameState.typingIndex++;
            gameState.typingTimeout = setTimeout(type, speed);
        } else {
            gameState.isTyping = false;
            if (callback) callback();
        }
    }

    type();
}

function loadScript(scriptURL) {
    console.log(`Fetching script "${scriptURL}"...`);
  
    return fetch(`${scriptURL}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            console.log("Script fetched successfully");
            return response.text();
        })
        .then(text => {
            console.log("Parsing script...");
            const lines = text
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(line => line)
                .map(parseScriptLine)
                .filter(Boolean);
            console.log(`Total lines parsed: ${lines.length}`);
            return lines;
        })
        .catch(error => {
            console.error("Error loading script: ", error);
            return [];
        });
}

function parseScriptLine(line) {
    const eventMatch = line.match(/^\[(\w+)(?:\((.*)\))?\]$/i);
    if (eventMatch) {
        const eventType = eventMatch[1].toLowerCase();
        const rawParams = eventMatch[2] || "";

        let parsedParams = {};
        if (rawParams) parsedParams = parseEventParams(rawParams);

        console.log(`(${eventType}) params="${rawParams}"`);

        return {
            type: eventType,
            data: {
                ...parsedParams
            }
        };
    }
    
    const eventMatch2 = line.match(/^\[(\w+)(?:\((.*)\))?\]\s*(.+)$/);
    if (eventMatch2) {
        const eventType = eventMatch2[1].toLowerCase();
        const rawParams = eventMatch2[2] || "";
        const content = eventMatch2[3] || "";
        
        let parsedParams = {};
        if (rawParams) parsedParams = parseEventParams(rawParams);
        
        console.log(`(${eventType}) content="${content}", params="${rawParams}"`);

        return {
            type: eventType,
            data: {
                content,
                ...parsedParams
            }
        };
    }
    
    const dialogMatch = line.match(/^\[name="(.*?)"\](.+)$/);
    if (dialogMatch) {
        console.log(`(dialog) speaker="${dialogMatch[1]}", text="${dialogMatch[2]}"`);
        return {
            type: "dialog",
            data: {
                speaker: dialogMatch[1],
                text: dialogMatch[2]
            }
        };
    }

    console.log(`(narration) text="${line}"`);
    return {
        type: "narration",
        data: {
            text: line
        }
    };

    // Note: support for multiline needed
    // [multiline(name="Babel Member")]Gah—
    // [multiline(name="Babel Member", end=true)]...The explosions stopped?
}

function parseEventParams(params) {
    const result = {};

    const regex = /(\w+)\s*=\s*(?:"([^"]*)"|([^",\s]+))/g;
    let match;
    while ((match = regex.exec(params)) !== null) {
        const key = match[1];
        const value = match[2] !== undefined ? match[2] : match[3];

        if (value === "true") {
            result[key] = true;
        } else if (value === "false") {
            result[key] = false;
        } else if (!isNaN(value) && value.trim() !== "") {
            result[key] = Number(value);
        } else {
            result[key] = value;
        }
    }

    return result;
}

function renderLine(entry) {
    
    if (!entry) return;
    
    switch (entry.type) {
        case "dialog":
            if (entry.data.text) {
                console.log(`Loading dialog "${entry.data.speaker}: ${entry.data.text}"`);
    
                gameState.dialogContainer.classList.remove('hidden');
                gameState.dialogSpeaker.textContent = entry.data.speaker;
                textWriter(gameState.dialogText, entry.data.text);

                gameState.isWaitingForInput = true;
            } else {
                gameState.dialogContainer.classList.add('hidden');
            }
            break;

        case "narration":
            console.log(`Loading narration "${entry.data.text}"`);

            gameState.dialogContainer.classList.remove('hidden');
            gameState.dialogSpeaker.textContent = "";
            textWriter(gameState.dialogText, entry.data.text);

            gameState.isWaitingForInput = true;
            break;

        case "decision":
            const options = entry.data.options.split(";");
            console.log(`Loading decision "${entry.data.options}"`);

            gameState.dialogContainer.classList.remove('hidden');
            gameState.dialogSpeaker.textContent = "Doctor";
            textWriter(gameState.dialogText, "(Choice) " + entry.data.options);

            gameState.isWaitingForInput = true;
            break;

        case "subtitle":
            if(entry.data.text) {
                console.log(`Loading subtitle "${entry.data.text}"`);
    
                gameState.dialogContainer.classList.remove('hidden');
                gameState.dialogSpeaker.textContent = "";
                textWriter(gameState.dialogText, entry.data.text);
    
                gameState.isWaitingForInput = true;
            }

            break;
            // if(!entry.data.text) {
            //     gameState.subtitle.classList.add('hidden');
            //     break;
            // }

            // console.log(`Loading subtitle "${entry.data.text}"`);

            // gameState.subtitle.classList.remove('hidden');
            // textWriter(gameState.subtitle,entry.data.text);

            // gameState.isWaitingForInput = true;
            // break;
            
            //[Sticker(id="st1", multi = true, text="<i>It was an evening close to New Year's.</i>", x=300,y=270,  alignment="left", size=24, delay=0.04, width=700,block = true)]


        //temp
        case "sticker":
            if (entry.data.text) {
                console.log(`Loading sticker "${entry.data.text}"`);
    
                gameState.dialogContainer.classList.remove('hidden');
                gameState.dialogSpeaker.textContent = "";
                textWriter(gameState.dialogText, entry.data.text);
    
                gameState.isWaitingForInput = true;
            }
            break;

        case "background":
            if(entry.data.image) {
                console.log(`Loading background "${entry.data.image}"`);
                gameState.background.style.backgroundImage = `url("` + getBackgroundURL(entry.data.image) + `")`;
            }
            break;

        case "image":
            if(entry.data.image) {
                if(entry.data.fadetime) {
                    gameState.isLocked = true;
                    gameState.isWaiting = true;
                    gameState.waitDuration = entry.data.fadetime;
                }

                console.log(`Loading image "${entry.data.image}"`);
                gameState.background.style.backgroundImage = `url("` + getImageURL(entry.data.image) + `")`;
            }
            break;

        //temp
        case "gridbg":
            const gridbgimg = entry.data.imagegroup.split("/")[0];

            if(gridbgimg) {
                console.log(`Loading gridbg "${entry.data.image}"`);
                gameState.background.style.backgroundImage = `url("` + getBackgroundURL(gridbgimg) + `")`;
            }
            break;
            
        case "blocker":
            console.log(`Loading blocker A:${entry.data.a} R:${entry.data.r} G:${entry.data.g} B:${entry.data.b} with duration ${entry.data.fadetime}`);

            gameState.blockerElement.style.transition = `background-color ${entry.data.fadetime}s linear`;
            gameState.blockerElement.style.backgroundColor = `rgba(${entry.data.r}, ${entry.data.g}, ${entry.data.b}, ${entry.data.a})`;
            
            gameState.isLocked = true;
            gameState.isWaiting = true;
            gameState.waitDuration = entry.data.fadetime;

            if (entry.data.block === true) {
                gameState.dialogContainer.classList.add('hidden');
            }
            break;

        case "delay":
            console.log(`Triggered delay of ${entry.data.time}s`);
            gameState.isLocked = true;
            gameState.isWaiting = true;
            gameState.waitDuration = entry.data.time;
            break;

        case "playmusic":
            if (gameState.music) {
                gameState.music.pause();
                gameState.music = null;
            }

            const loopName = entry.data.key.replace(/^\$/, "");
            console.log("Playing music:", loopName);
    
            const loopAudio = new Audio(getAudioURL(loopName));
            loopAudio.loop = true;
            loopAudio.volume = 0.1;
        
            if (entry.data.intro) {
                const introName = entry.data.intro.replace(/^\$/, "");
                const introAudio = new Audio(getAudioURL(introName));
                introAudio.volume = 0.1;

                gameState.music = introAudio;

                introAudio.addEventListener("ended", () => {
                    gameState.music = loopAudio;
                    loopAudio.play();
                });
        
                introAudio.play();
            } else {
                gameState.music = loopAudio;
                loopAudio.play();
            }

            break;

        // case "character":
        case "charslot":
            if (entry.data.slot) {
                if (entry.data.name) {
                    if (!entry.data.name.match(/#\d+\$\d+$/)) entry.data.name += "#1$1";
                    
                    const img = document.createElement("img");
                    img.src = getCharacterURL(entry.data.name);
                    
                    if (entry.data.duration) {
                        img.classList.add("fade-in");
                        img.style.setProperty("--fade-duration", `${entry.data.duration}s`);
                    
                        img.onload = () => {
                            requestAnimationFrame(() => {
                                img.classList.add("visible");
                            });
                        };

                        // gameState.isWaiting = true;
                        // gameState.isLocked = true;
                        // gameState.waitDuration = entry.data.duration;

                        gameState.dialogContainer.classList.add('hidden');
                    }

                    switch (entry.data.slot) {
                        case "left":
                        case "l":
                            gameState.characterLeftElement.innerHTML = "";
                            gameState.characterLeftElement.appendChild(img);
                            break;
                        case "right":
                        case "r":
                            gameState.characterRightElement.innerHTML = "";
                            gameState.characterRightElement.appendChild(img);
                            break;
                        case "middle":
                        case "m":
                            gameState.characterMiddleElement.innerHTML = "";
                            gameState.characterMiddleElement.appendChild(img);
                            break;
                        default:
                            console.warn("Invalid slot:", entry.slot);
                            return;
                    }
                }

                gameState.characterLeftElement.classList.remove("dimmed");
                gameState.characterRightElement.classList.remove("dimmed");
                gameState.characterMiddleElement.classList.remove("dimmed");
    
                if (entry.data.focus) {
                    switch (entry.data.focus) {
                        case "left":
                        case "l":
                            gameState.characterRightElement.classList.add("dimmed");
                            gameState.characterMiddleElement.classList.add("dimmed");
                            break;
                        case "right":
                        case "r":
                            gameState.characterLeftElement.classList.add("dimmed");
                            gameState.characterMiddleElement.classList.add("dimmed");
                            break;
                        case "middle":
                        case "m":
                            gameState.characterLeftElement.classList.add("dimmed");
                            gameState.characterRightElement.classList.add("dimmed");
                            break;
                        case "n":
                            gameState.characterLeftElement.classList.add("dimmed");
                            gameState.characterMiddleElement.classList.add("dimmed");
                            gameState.characterRightElement.classList.add("dimmed");
                            break;
                        default:
                            console.warn("Invalid focus:", entry.data.slot);
                            return;
                    }
                }
            } else {
                gameState.characterLeftElement.innerHTML = "";
                gameState.characterRightElement.innerHTML = "";
                gameState.characterMiddleElement.innerHTML = "";
            }
            break;


        case "stopmusic":
            console.log("Stopping music with fadetime:", entry.data.fadetime);
            if (gameState.music) {
                if (entry.data.fadetime) {
                    const fadeSteps = 50;
                    const stepTime = entry.data.fadetime * 1000 / fadeSteps;
                    const volumeStep = gameState.music.volume / fadeSteps;
                
                    const fadeInterval = setInterval(() => {
                        if (gameState.music.volume > volumeStep) {
                            gameState.music.volume -= volumeStep;
                        } else {
                            gameState.music.volume = 0;
                            gameState.music.pause();
                            clearInterval(fadeInterval);
                        }
                    }, stepTime);
                } else {
                    gameState.music.pause();
                    gameState.music = null;
                }
            }

            break;

        case "playsound":
            const soundName = entry.data.key.replace(/^\$/, "");
            console.log("Playing sound:", soundName);

            try {

                const audio = new Audio(getAudioURL(soundName));
                
                audio.volume = 0.1;
                audio.play();
            } catch (error) {
                console.error("Error playing sound:", error);
            }

            break;
        default:
            console.log("Unhandled entry type:", entry.type);
    }
}

function getBackgroundURL(name) {
    const baseURL = "https://raw.githubusercontent.com/akgcc/arkdata/main/assets/torappu/dynamicassets/avg/backgrounds/";
    return baseURL + encodeURIComponent(name.toLowerCase()) + ".png";
}

function getImageURL(name) {
    const baseURL = "https://raw.githubusercontent.com/akgcc/arkdata/main/assets/torappu/dynamicassets/avg/images/";
    return baseURL + encodeURIComponent(name.toLowerCase()) + ".png";
}

function getCharacterURL(name) {
    const baseURL = "https://raw.githubusercontent.com/akgcc/arkdata/main/assets/avg/characters/";
    return baseURL + encodeURIComponent(name.toLowerCase()) + ".png";
}

function getAudioURL(name) {
    //temp
    if (name === "m_act1mainss_bat1_loop") {
        return "assets/m_act1mainss_bat1_loop.wav"
    } else if (name === "m_act1mainss_bat1_intro") {
        return "assets/m_act1mainss_bat1_intro.wav"
    } else if (name === "m_sys_act1mainss_loop") {
        return "assets/m_sys_act1mainss_loop.wav"
    } else if (name === "m_sys_act1mainss_intro") {
        return "assets/m_sys_act1mainss_intro.wav"
    } else {
        const baseURL = "https://raw.githubusercontent.com/akgcc/arkdata/main/assets/torappu/dynamicassets/audio/";
        return baseURL + encodeURIComponent(gameState.storyVariables[name].toLowerCase()) + ".mp3";
    }
}

function loadStoryVariables(url) {
    return fetch(url)
        .then(response => response.json())
        .then(data => {
            return data;
        });
}

function updateStorySelection() {
    const currentlySelectedStory = document.getElementById("story-select").value;
    document.getElementById("story-select").innerHTML = "";
    
    const categoryLabels = {
        MAIN_STORY: "Main Story",
        ACTIVITY_STORY: "Side Story",
        MINI_STORY: "Story Collection",
    };

    const categories = {
        MAIN_STORY: [],
        ACTIVITY_STORY: [],
        MINI_STORY: [],
    };

    const language = document.getElementById("language-select").value;
    loadStoryReviewTable(language).then(storyReviewTable => {
        
        // Store the story review table
        gameState.storyReviewTable = storyReviewTable;

        // Categorize each story activity
        Object.values(storyReviewTable).forEach((activity) => {
            switch(activity.actType) {
                case "MAIN_STORY":
                    // console.log("Main Theme:", activity.name);
                    categories.MAIN_STORY.push(activity);
                    break;
                case "MINI_STORY":
                    // console.log("Story Collection:", activity.name);
                    categories.MINI_STORY.push(activity);
                    break;
                case "ACTIVITY_STORY":
                    // console.log("Side Story:", activity.name);
                    categories.ACTIVITY_STORY.push(activity);
                    break;
                default:
                    break;
            }
        });
        
        // Populate the story selection dropdown
        for (const [actType, activities] of Object.entries(categories)) {
    
            const optgroup = document.createElement("optgroup");
            optgroup.label = categoryLabels[actType];
    
            activities.forEach((activity) => {
                const option = document.createElement("option");
                option.value = activity.id;
                option.textContent = activity.name;
                // option.textContent = "("+activity.id+") "+activity.name;

                optgroup.appendChild(option);
            });
    
            document.getElementById("story-select").appendChild(optgroup);
        }

        // If a story was previously selected, set it as the current selection
        if (currentlySelectedStory) document.getElementById("story-select").value = currentlySelectedStory;
        updateChapterSelection();

    }).catch(error => {
        console.error("Error loading story review table:", error);
    });
}

function loadStoryReviewTable(language) {
    switch (language) {
        case "en_US":
            return fetch("https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/refs/heads/main/en_US/gamedata/excel/story_review_table.json")
            .then(response => response.json());
        case "ja_JP":
            return fetch("https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/refs/heads/main/ja_JP/gamedata/excel/story_review_table.json")
            .then(response => response.json());
        case "ko_KR":
            return fetch("https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/refs/heads/main/ko_KR/gamedata/excel/story_review_table.json")
            .then(response => response.json());
        case "zh_CN":
            return fetch("https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/story_review_table.json")
            .then(response => response.json());
        case "local":
            return fetch("assets/story/story_review_table.json")
            .then(response => response.json());
        default:
            console.error("Unsupported language:", language);
            return null;
    }
}

function updateChapterSelection() {
    document.getElementById("chapter-select").innerHTML = "";

    const story = gameState.storyReviewTable[document.getElementById("story-select").value];
    
    Object.values(story.infoUnlockDatas).forEach((chapter) => {
        const option = document.createElement("option");
        option.value = chapter.storyTxt;
        option.textContent = chapter.storyCode + " " + chapter.storyName;

        switch (chapter.avgTag) {
            case "Before Operation":
            case "戦闘前":
            case "작전 전":
            case "行动前":
                option.textContent += " (Before)";
                break;

            case "After Operation":
            case "戦闘後":
            case "작전 후":
            case "行动后":
                option.textContent += " (After)";
                break;
            
            case "Interlude":
                break;
        }
        
        document.getElementById("chapter-select").appendChild(option);
    });
}

function getStoryURL(language, script) {
    switch (language) {
        case "en_US": return "https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/main/en_US/gamedata/story/" + encodeURIComponent(script.toLowerCase()) + ".txt";
        case "ja_JP": return "https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/main/ja_JP/gamedata/story/" + encodeURIComponent(script.toLowerCase()) + ".txt";
        case "ko_KR": return "https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/main/ko_KR/gamedata/story/" + encodeURIComponent(script.toLowerCase()) + ".txt";
        case "zh_CN": return "https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/story/" + encodeURIComponent(script.toLowerCase()) + ".txt";
        case "local": return "assets/story/" + encodeURIComponent(script.toLowerCase()) + ".txt";
        default:
            console.error("Unsupported language:", language);
            return null;
    }

}

/**
 * only 2 states - player input allowed, player input not allowed
 * 
 * player input only after dialog type 
 * disable player input immediately after inputting
 * in the event of an error, we need an override though
 * how to detect this?
 */

window.addEventListener("DOMContentLoaded", () => {

    updateStorySelection();
    // console.log("Hash:", window.location.hash);
    // Promise.all([
    //     loadScript("assets/level_main_15-15_end.txt"),
    //     // loadScript("assets/level_act33side_05_beg.txt"),
    //     loadStoryVariables("https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/main/en_US/gamedata/story/story_variables.json")
    // ]).then(([script, storyVariables]) => {
    //     gameEngine.start("level_main_13-04_end", script, storyVariables);
    // });
});

document.getElementById("scene-container").addEventListener("click", () => {
    gameEngine.userAction();
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        gameEngine.userAction();
    }
});

window.addEventListener("hashchange", () => {
    console.log("Hash:", window.location.hash);
});

document.getElementById('fullscreen-button').addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.getElementById('game-container').requestFullscreen()
        .catch(error => {
          console.error(`Error attempting fullscreen: ${error.message}`);
        });
    } else {
      document.exitFullscreen()
        .catch(error => {
          console.error(`Error exiting fullscreen: ${error.message}`);
        });
    }
});

document.getElementById('language-select').addEventListener('change', function() {
    updateStorySelection();
});

document.getElementById('story-select').addEventListener('change', function() {
    updateChapterSelection();
});

document.getElementById('load-scene').addEventListener('click', () => {

    const language = document.getElementById("language-select").value;
    const chapter = document.getElementById("chapter-select").value;

    gameEngine.reset();

    Promise.all([
        loadScript(getStoryURL(language, chapter)),
        loadStoryVariables("https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/main/en_US/gamedata/story/story_variables.json")
    ]).then(([script, storyVariables]) => {
        gameEngine.start(script, storyVariables);
    });
});