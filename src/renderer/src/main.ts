import "./assets/base.css";

import { mount } from "svelte";
import App from "./app.svelte";

export default mount(App, {
  target: document.querySelector("#app")!
});
