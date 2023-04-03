const template = document.createElement("template");
template.innerHTML = `
  <style>
    
    
    
    :host{
      display: block;
      --myvar: #bada55;
    }
    .message{
        display: flex; 
        flex-direction: row; 
        justify-content: flex-start; 
        align-items: center; 
        gap: 1rem; 
        width: 50%; 
    }
    .message > div{
        display: flex; 
        flex-direction: column; 
        justify-content: center; 
        align-items: flex-start; 
        
    }
    .message .material-symbols-outlined{
        font-size: 4rem; 
    }
   
    .message.info{
        background-color: #e9c834; 
        color: #000; 
        border-top: 1rem solid #000; 
    }
    .message.error{
        background-color: #71a9f7; 
        color: #aa3939; 
        border-top: 1rem solid #aa3939; 
    }
  </style>
  <div class="message">
    <div>
        <span class="material-symbols-outlined"></span>
    </div>
    <div>
    <slot name="title">Message</slot>
    <slot name="message">Easter Egg</slot>
        <p class="actions">
            <button><slot name="done"></slot></button>
        </p>
    </div>
  </div>
`;

class MessageBox extends HTMLElement {
  static defaultDelay = 5000; //static prop Component.defaultProp; it is available to instances of sample, but it is shared among them - it exists inside of Component only
  #timmy = null; //private variable
  //   sample = "hello"; //public variable

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "closed" });
    const clone = template.content.cloneNode(true);
    this.root.appendChild(clone);
    this.div = this.root.querySelector("div.message");
  }

  static get observedAttributes() {
    return ["type", "action", "removal"];
  }
  get type() {
    //when someone asks for a property, get the value from the attribute
    return this.getAttribute("type");
  }
  set type(value) {
    //when someone updates a property, update the attribute too
    this.setAttribute("type", value);
  }
  get action() {
    //when someone asks for a property, get the value from the attribute
    return this.getAttribute("action");
  }
  set action(value) {
    //when someone updates a property, update the attribute too
    this.setAttribute("action", value);
  }
  get removal() {
    //when someone asks for a property, get the value from the attribute
    return this.getAttribute("removal");
  }
  set removal(value) {
    //when someone updates a property, update the attribute too
    this.setAttribute("removal", value);
  }
  connectedCallback() {
    //when the component is added to the DOM
    //check for the removal property... set a default value for the timeout...
    let btnSlot = this.div.querySelector(".actions slot");
    if (btnSlot.assignedNodes().length == 0) {
      // if no slot for the button get rid of the containing paragraph and the button
      this.div.querySelector(".actions").remove();
    } else {
      let btn = this.div.querySelector(".actions button");
      btn.addEventListener("click", this.handleClick.bind(this));
      //this.handleClick.apply(this, []) - run the function handleClick right now and use message-box as 'this
      //this.handleClick.call(this, a, c, b) - does the same thing as apply, but you need to list the array items;
      //this.handleClick.bind(this) - make a copy and wait to call it later using the message-box as 'this'
    }
  }
  handleClick(ev) {
    //when the user clicks the button
    //this.action was set in attributeChangedCallback
    console.log(this.action, this.doRemove);
    if (
      this.action &&
      this.action in window &&
      typeof window[this.action] === "function"
    ) {
      //we were giving a function from the webpage
      window[this.action]();
      //stop the timeout running if there is one
    }
    if (this.doRemove) {
      //stop the timeout running if there is one
      //and remove it from the screen
      window.document.querySelector("message-box").remove();
    }
  }
  disconnectedCallback() {
    //when the component is removed from the DOM
  }
  attributeChangedCallback(attrName, oldVal, newVal) {
    //when an attribute is added or changed
    if (oldVal !== newVal) {
      switch (attrName) {
        case "type":
          this.div.querySelector(".material-symbols-outlined").textContent =
            "info";
          this.div.classList.add(this.type);
          //   switch (
          //     this.type //or newVal
          //   ) {
          //     case "info":
          //       //type="info"
          //       this.div.querySelector(".material-icons").textContent = "info";
          //       this.div.classList.add(this.type);
          //       break;
          //     case "error":
          //       //type="error"
          //       this.div.classList.add(this.type);
          //       break;
          //   }
          break;
        case "action":
          this.action = newVal;
          console.log(this.action);
        case "removal":
          console.log("Removal", this.removal);
          if (this.removal === "") {
            //the attribute exists but has no value
            //still want to delete the message-box with the click
            this.doRemove = true;
          } else if (this.removal && !isNaN(this.removal)) {
            this.doRemove = true;
          } else {
            this.doRemove = false;
          }
      }
    }
  }

  #privateMethod() {
    //can only be called from inside the component
  }
  publicMethod() {
    //can be called from web page
  }
}

window.customElements.define("message-box", MessageBox);
