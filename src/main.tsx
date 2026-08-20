import { hydrateRoot } from "react-dom/client";
import { startInstance } from "./start";
import { getRouter } from "./router";

const router = getRouter();

hydrateRoot(document.getElementById("root")!, startInstance.client({ router }));



