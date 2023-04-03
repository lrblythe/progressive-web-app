import CACHE from "./cache.js";

const APP = {
  currentPage: "home",
  data: [],
  selectedPerson: null,
  selectedGift: null,
  nameInput: document.getElementById("name"),
  dobInput: document.getElementById("dob"),
  giftInput: document.getElementById("gift-idea"),
  storeInput: document.getElementById("store"),
  urlInput: document.getElementById("url"),
  addPersonHeader: document.getElementById("addPersonHeader"),
  giftIdeasHeader: document.getElementById("giftIdeasHeader"),
  addOrEditGift: document.getElementById("addOrEditGift"),
  userMessage: document.querySelector(".user-message"),

  init() {
    //check the cache and store the 'person' arrays in the single source of truth(SST), which is APP.data
    APP.registerWorker();
    APP.getFileNames();
    APP.addListeners();
  },
  addListeners() {
    //add DOM listeners
    document.querySelector(".add").addEventListener("click", APP.add);

    document.querySelector(".back").addEventListener("click", APP.back);

    document
      .getElementById("savePerson")
      .addEventListener("click", APP.savePerson);

    document
      .querySelector(".list-of-names")
      .addEventListener("click", APP.editOrGiftClicked);

    document.getElementById("saveGift").addEventListener("click", APP.saveGift);

    document
      .getElementById("cancelGift")
      .addEventListener("click", APP.cancelGift);

    document
      .getElementById("cancelPerson")
      .addEventListener("click", APP.cancelPerson);

    document
      .getElementById("deletePerson")
      .addEventListener("click", APP.deletePerson);

    document
      .querySelector(".list-of-gifts")
      .addEventListener("click", APP.editOrDeleteGiftClicked);
  },

  //Home Screen Functionality Follows:

  getFileNames() {
    //getting file names from the cache
    //runs after DOMContentLoaded

    CACHE.getAllFilesFromCache()
      .then((listOfRequests) => {
        let matches = listOfRequests.map((request) => {
          let url = new URL(request.url);
          let file = url.pathname.split("/").at(-1);
          return file;
        });
        return matches;
      })
      .then((matches) => {
        //send these matches to new function, forEach over them and call CACHE.getSingleFile and get all of the objects, place them in the SST array

        if (matches.length === 0) {
          APP.userMessage.innerHTML = `<p class="no-data-message">Click the '+' button to add birthday information for someone you know.</p>`;
          return;
        }
        APP.retrieveJsonPeople(matches);
      })
      .catch((err) => {
        console.warn(err.message);
        //display message component
      });
  },
  retrieveJsonPeople(data) {
    //we have filenames from the cache, create a request and go to cache to get the actual file contents from the cache
    data.map((personFilename) => {
      let request = new Request(`/data/${personFilename}`);
      CACHE.getSingleFileFromCache(request)
        .then((matchResponse) => {
          if (!matchResponse) throw new Error("bad file request");

          return matchResponse;
        })
        .then((contents) => {
          APP.data.push(contents);
          APP.buildPeopleOnHome();
          //this is building the content on the home screen EACH time the loop runs, but I could not figure out where to call buildPeopleOnHome() to get it to work properly
        })
        .catch((err) => {
          console.warn(err.message);
          //display message component
        });
    });
  },

  buildPeopleOnHome() {
    //take info from APP.data Single Source Of Truth and build data on home screen
    //look at APP.data and sort by birthday
    APP.userMessage.innerHTML = "";
    let nameList = document.querySelector(".list-of-names");
    //order the birthdays from APP.data in chronological order
    if (APP.data.length === 0) {
      //no people added yet
      APP.userMessage.innerHTML = `<p class="no-data-message">Click the '+' button to add birthday information for someone you know.</p>`;
      //also clear out the list of names since there will be one left over from before
      nameList.innerHTML = "";
      return;
    }

    let data = APP.data
      .map((person) => {
        let bday = APP.convertMonth(person.dob);
        //convert the month and date to a score to be used for ordering the information
        let bdayScore = APP.bdayScore(bday);
        return { id: person.id, name: person.name, bday, bdayScore };
      })
      .sort((a, b) => {
        return a.bdayScore - b.bdayScore;
      });
    nameList.innerHTML = data
      .map((person) => {
        return `
    <li class="name-box" data-id="${person.id}">
            <div class="name-and-birthday">
              <p class="name">${person.name}</p>
              <p class="birthday">${person.bday}</p>
            </div>
            <div class="edit-and-gift">
              <button
                class="btn"
                id="edit-person"
                data-id="edit-person"
                title="edit"
              >
                <i class="material-symbols-outlined" data-id="edit-person"
                  >edit</i
                >
              </button>
              <button class="btn" id="gift" data-id="gift" title="gift">
                <i class="material-symbols-outlined" data-id="gift">redeem</i>
              </button>
            </div>
          </li>
    `;
      })
      .join("");
  },
  savePerson(ev) {
    //From the 'Add Person' screen, user has clicked the 'Save' button to attempt to save the data
    //Could also be that the user forgot to enter name or birthday, so display an error message
    //if there is currently something in APP.selectedPerson, DON'T make a whole new file: take the updated info and add it to the cache
    ev.preventDefault();
    document.querySelector(".add-person-error-message").innerHTML = "";
    let name = document.getElementById("name").value;
    let dob = document.getElementById("dob").value;
    if (name === "" || dob === "") {
      document.querySelector(
        ".add-person-error-message"
      ).innerHTML = `Please enter a name and a birthday`;
    }
    name = name.trim();
    let dobFormatted = new Date(dob);
    let dobTimestamp = dobFormatted.getTime();
    if (!name || !dobTimestamp) return;

    //if there is something in APP.selectedPerson, the file exists already, and we need to update it accordingly
    if (APP.selectedPerson !== null) {
      APP.selectedPerson.name = name;
      APP.selectedPerson.dob = dobTimestamp;
      //put the updated name and birthday (APP.selectedPerson) in the cache
      APP.savePersonAsFile(APP.selectedPerson);
      APP.buildPeopleOnHome();
      APP.navigate("home");
      return;
    }

    //Now we know we are dealing with a fresh file
    let person = {
      id: crypto.randomUUID(),
      name: "",
      dob: 0,
      gifts: [],
    };

    person.name = name;
    person.dob = dobTimestamp;
    APP.savePersonAsFile(person);

    //push to APP.data with the new person (already saving to cache in APP.saverPersonAsFile)
    APP.data.push(person);
    APP.buildPeopleOnHome();
    APP.navigate("home");
    APP.nameInput.value = "";
    APP.dobInput.value = "";
  },
  savePersonAsFile(person) {
    //Can be used to save a new person, OR to update the cache when new gifts have been added to an existing person
    //if receiving a person file
    if (person) {
      //turn the data into contents for a json file
      let personJson = JSON.stringify(person);
      let filename = Date.now();

      //create a file with the json
      let file = new File([personJson], `${person.id}.json`, {
        type: "application/json",
        lastModified: Date.now(),
      });

      //create a response object to hold the file
      let response = new Response(file, {
        status: 200,
        statusText: "Ok",
        headers: {
          "content-type": file.type,
          "content-length": file.size,
          "X-file": file.name,
        },
      });

      //save the response in the cache
      APP.saveFile(filename, response);
    } else {
      //not a person file
      return;
    }
  },
  saveFile(filename, response) {
    //Save a file to the cache
    if (response) {
      CACHE.saveToCache()
        .then((cache) => {
          CACHE.cache = cache;
          let name = response.headers.get("X-file");
          //the {name} here is referring to the x-file - that 'name' is the filename - the crypto string
          let url = new URL(`/data/${name}`, location.origin);
          cache.put(url, response);
        })
        .then(() => {
          //
        })
        .catch((err) => {
          console.warn(err.message);
          //DISPLAY MESSAGE COMPONENT
        });
    }
  },
  cancelPerson(ev) {
    //On the 'Add Person' or 'Edit Person' screen, cancel was clicked
    //Send the user back to the 'Home' screen
    ev.preventDefault();
    //clear out error message just in case
    document.querySelector(".add-person-error-message").innerHTML = "";
    //bring back the Delete button so it's ready
    // if (document.querySelector(".none")) {
    //   document.getElementById("deletePerson").classList.remove("none");
    // }
    APP.selectedPerson = null;
    APP.navigate("home");
  },
  deletePerson(ev) {
    //delete was clicked on Edit Person screen
    //delete the user from the cache, then update the APP.data file, then go to home screen and display updated list
    ev.preventDefault();
    let confirm = window.confirm(
      "Are you sure you want to delete this person?"
    );
    if (confirm == false) {
      return;
    }

    //confirm was clicked, now we delete
    let filename = APP.selectedPerson.id;
    let jsonFilename = filename + ".json";
    let request = new Request(`/data/${jsonFilename}`);

    CACHE.deleteSingleFileFromCache(request)
      .then(() => {
        //find the filename in the SST
        //let personData = APP.data.find(({ id }) => id === filename);
        let personData = APP.data.find((person) => person.id === filename);

        let personIndex = APP.data.indexOf(personData);
        if (personIndex > -1) {
          // if the item is found in APP.data
          APP.data.splice(personIndex, 1);
        }

        APP.buildPeopleOnHome();
        APP.navigate("home");
      })
      .catch((err) => {
        console.warn(err.message);
        //display message component
      });
  },
  editOrGiftClicked(ev) {
    //On the Home screen, find out which person was clicked...using .closest
    //find out their data from APP.data
    //find out if the edit button or the gift button were clicked on the home page
    let personId = ev.target.closest("li").dataset.id;
    let personData = APP.data.find(({ id }) => id === personId);
    APP.selectedPerson = personData;

    if (ev.target.dataset.id === "edit-person") {
      //if a button with edit-person was clicked
      //send their data to editPerson function
      APP.editPerson();
    } else if (ev.target.dataset.id === "gift") {
      //a button with gift was clicked, go to the giftList screen
      APP.giftList();
    } else {
      //something else was clicked and we're not dealing with it
      return;
    }
  },
  editPerson() {
    //change h2 title on Add Screen to "Edit Person's Name"
    //show person's info on Edit Person screen
    //go to add person screen
    let timeStamp = APP.selectedPerson.dob;

    let formatted = new Date(timeStamp);

    let yyyy = formatted.getUTCFullYear();
    let mm = "" + (formatted.getUTCMonth() + 1);
    let dd = "" + formatted.getUTCDate();
    if (mm.length < 2) mm = "0" + mm;
    if (dd.length < 2) dd = "0" + dd;
    let birthday = yyyy + "-" + mm + "-" + dd;

    APP.addPersonHeader.textContent = `Edit ${APP.selectedPerson.name}`;
    document.getElementById("name").value = `${APP.selectedPerson.name}`;
    document.getElementById("dob").value = birthday;
    //add the delete button to the screen
    if (document.querySelector(".none")) {
      document.getElementById("deletePerson").classList.remove("none");
    }
    APP.navigate("add-person");
  },
  giftList() {
    //on the Home screen, a person's gift button has been clicked and the gift list should be loaded on the Gift List screen
    //check cache for most up to date list of gifts, update APP.data with info from the cache, update APP.selectedPerson as well
    APP.selectedPersonUpdateFromCache();

    //add header at the top with the selected person's name
    APP.giftIdeasHeader.textContent = `Gift Ideas For ${APP.selectedPerson.name}`;
    //if there are no gifts yet, display message on screen
    if (APP.selectedPerson.gifts.length === 0) {
      document.querySelector(
        ".list-of-gifts"
      ).innerHTML = `<p class="no-data-message">Click the '+' button to add some gift ideas!</p>`;
    } else {
      //check gifts array if there are gifts and show them on the page
      document.querySelector(".list-of-gifts").innerHTML =
        APP.selectedPerson.gifts
          .map((gift) => {
            return `
          <li class="gift-box" data-id="${gift.gift_id}">
            <div class="gift-name-and-store">
              <p class="gift-name">${gift.text}</p>
              <p class="store">${gift.store}</p>
              <p class="url">${gift.url}</p>
            </div>
            <div class="edit-and-delete">
              <button
                class="btn"
                id="edit-gift"
                data-id="edit-gift"
                title="edit-gift"
              >
                <i class="material-symbols-outlined" data-id="edit-gift"
                  >edit</i
                >
              </button>
              <button
                class="btn"
                id="delete-gift"
                data-id="delete-gift"
                title="delete-gift"
              >
                <i class="material-symbols-outlined" data-id="delete-gift"
                  >delete</i
                >
              </button>
            </div>
          </li>
        `;
          })
          .join("");
    }
    //show the gift list screen again with the updated info
    APP.navigate("gift-list");
  },
  selectedPersonUpdateFromCache() {
    //go to cache, get most up to date info about selected person, update SST with that info
    //used just before building the gift list
    let filename = APP.selectedPerson.id;
    let jsonFilename = filename + ".json";
    let request = new Request(`/data/${jsonFilename}`);
    CACHE.getSingleFileFromCache(request)
      .then((matchResponse) => {
        if (!matchResponse) throw new Error("bad file request");

        return matchResponse;
      })
      .then((contents) => {
        //find the filename in the SST
        let personData = APP.data.find((person) => person.id === filename);
        //updated APP.data at the correct spot in the array
        APP.data[personData] = contents;
      })
      .catch((err) => {
        console.warn(err.message);
        //display message component
      });
  },

  //Gift Screen Functionality functions

  addGift() {
    //Add Gift button has been clicked (triggered by switch/case)
    //display name of person you are adding gift for
    //check if the correct person is loaded
    //remove any possible error messages from Add Person screen
    APP.giftInput.value = "";
    APP.storeInput.value = "";
    APP.urlInput.value = "";
    APP.addOrEditGift.textContent = `Add a gift for ${APP.selectedPerson.name}`;
    document.querySelector(".add-gift-error-message").innerHTML = "";
  },
  saveGift(ev) {
    //save button has been clicked on Add Gift

    ev.preventDefault();

    let giftIdea = APP.giftInput.value;
    let store = APP.storeInput.value;
    let url = APP.urlInput.value;
    if (giftIdea === "" || store === "") {
      document.querySelector(
        ".add-gift-error-message"
      ).innerHTML = `Please enter a gift idea and store. Url is optional.`;
      return;
    }

    if (APP.selectedGift !== null) {
      //the user is EDITING a gift and saving changes
      //NOT saving a new gift
      //the selected gift to edit has been saved in APP.selectedGift
      //need to find the gift via the selectedGift in the APP.selectedPerson gift array
      //need to update the gift in the APP.selectedPerson gifts array - find index and replace data at that index
      //send APP.selectedPerson to APP.savePersonAsFile
      APP.selectedGift.text = giftIdea;
      APP.selectedGift.store = store;
      APP.selectedGift.url = url;

      let giftIndex = APP.selectedPerson.gifts.indexOf(APP.selectedGift);
      APP.selectedPerson.gifts[giftIndex] = APP.selectedGift;
      APP.savePersonAsFile(APP.selectedPerson);
      APP.selectedGift = null;
      APP.giftList();
      APP.navigate("gift-list");
      return;
    }

    //creating a new gift

    let giftData = {
      gift_id: crypto.randomUUID(),
      text: giftIdea,
      store: store,
      url: url,
    };

    APP.selectedPerson.gifts.push(giftData);
    //put the saved gift (APP.selectedPerson) in the cache
    APP.savePersonAsFile(APP.selectedPerson);
    //this also calls the selectedPersonUpdateFromCache, which updates APP.data

    APP.giftList();
    APP.navigate("gift-list");
    //clear out data from form on add gift screen
    APP.giftInput.value = "";
    APP.storeInput.value = "";
    APP.urlInput.value = "";
  },
  cancelGift(ev) {
    //cancel button has been clicked on add OR edit gift screen
    ev.preventDefault();
    APP.selectedGift = null;
    APP.giftList();
    APP.navigate("gift-list");
    //clear out error message just in case
    document.querySelector(".add-gift-error-message").innerHTML = "";
  },

  editOrDeleteGiftClicked(ev) {
    //On gift list screen, find out which button was clicked: edit or delete
    //We already know which person was clicked and can access it using APP.selectedPerson
    //Use .closest li to find out which gift was clicked from the data-id on the <li>
    let giftId = ev.target.closest("li").dataset.id;
    let giftData = APP.selectedPerson.gifts.find(
      ({ gift_id }) => gift_id === giftId
    );

    //set the selectedGift data in a variable
    APP.selectedGift = giftData;

    if (ev.target.dataset.id === "edit-gift") {
      //edit gift was clicked
      //go to edit gift screen and display gift information on the screen
      APP.editGift(giftData);
    } else if (ev.target.dataset.id === "delete-gift") {
      //delete gift was clicked
      APP.deleteGift(giftData);
    } else {
      //neither edit nor delete were clicked
      return;
    }
  },
  editGift(giftData) {
    //add name of gift to header
    //add values from gift to input boxes
    APP.addOrEditGift.textContent = `Edit ${giftData.text}`;
    document.getElementById("gift-idea").value = `${giftData.text}`;
    document.getElementById("store").value = `${giftData.store}`;
    document.getElementById("url").value = `${giftData.url}`;
    APP.navigate("add-gift");
    document.querySelector(".add-gift-error-message").innerHTML = "";
  },
  deleteGift(giftData) {
    //use confirm() prompt before deleting
    //delete gift in cache - use APP.selectedPerson to send new person object to cache and update that file
    //can also use APP.selectedGift here
    //delete gift in APP.selectedPerson and in APP.data
    //remove li from ul on gift-list screen
    let confirm = window.confirm("Are you sure you want to delete this gift?");
    if (confirm == false) {
      return;
    }
    //user confirmed they want to delete
    //update SST - delete from APP.data
    let giftIndex = APP.selectedPerson.gifts.indexOf(APP.selectedGift);

    if (giftIndex > -1) {
      APP.selectedPerson.gifts.splice(giftIndex, 1);
    }
    //APP.savePersonAsFile will also build the gift list screen
    APP.savePersonAsFile(APP.selectedPerson);
    APP.selectedGift = null;
    //build updated gift list on gift list screen
    APP.giftList();
  },

  convertMonth(dob) {
    //convert month format to 'February 21' format, no year

    let dobFormatted = new Date(dob);

    let months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    let birthday =
      months[dobFormatted.getUTCMonth()] + " " + dobFormatted.getUTCDate();

    return birthday;
  },
  bdayScore(birthday) {
    //convert the person's birthday (format 'January 21') into a number (ie. January 21 = 021, May 14 = 414)
    let bday = birthday.split(" ");

    let month = bday[0];

    let day = bday[1];
    //if the number is single digit, add a 0 before it
    if (day.length < 2) day = "0" + day;

    let months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    let monthNumber = months.indexOf(month);

    let monthScore = monthNumber + day;

    return monthScore;
  },

  //Navigation functions
  add(ev) {
    //clicked the add button
    //use switch case to know where to go
    switch (APP.currentPage) {
      case "home":
        APP.addPersonHeader.textContent = "Add Person";
        APP.nameInput.value = "";
        APP.dobInput.value = "";
        //get rid of the 'Delete' button from the Add Person screen - if you're adding a new person, you don't need a Delete button
        document.getElementById("deletePerson").classList.add("none");
        //set selectedPerson to null so that it is a fresh file being saved to the cache if someone is performing Add Person
        APP.selectedPerson = null;
        APP.navigate("add-person");
        break;
      case "gift-list":
        APP.addGift();
        APP.navigate("add-gift");
        break;
      case "add-person":
        APP.navigate("home");
        break;
      case "edit-person":
        APP.navigate("add-person");

        break;

      default:
      //do nothing
    }
  },
  back(ev) {
    switch (APP.currentPage) {
      case "gift-list":
      case "edit-person":
        APP.navigate("home");
        break;
      case "add-person":
        APP.navigate("home");

        break;
      case "add-gift":
        APP.navigate("gift-list");
        break;
      default:
      //do nothing
    }
  },

  navigate(page) {
    document.body.className = page;
    APP.currentPage = page;
    switch (page) {
      case "home":
        //could use any of these in future
        break;
      case "gift-list":
        break;
      case "add-person":
        break;
      case "edit-person":
      case "add-gift":
        //
        break;
    }
  },
  registerWorker() {
    //register the Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("./sw.js")

        .catch((err) => {
          console.warn("Failed to register", err.message);
        });
    }
  },
};

document.addEventListener("DOMContentLoaded", APP.init);

/*
To Do:  

-add web component Error Messaging - message user on screen with an error feedback - could not figure out where to get this to display

PWA Requirements:

Final touches: 
-content security policy?
-A 404 type page is stored in the Cache, which you can display if a link to a web page is clicked and that link is not in your cache

*/
