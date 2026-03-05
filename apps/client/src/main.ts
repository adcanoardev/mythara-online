import Phaser from "phaser";
import { AuthScene } from "./scenes/AuthScene";
import { MainScene } from "./scenes/MainScene";

new Phaser.Game({
    type: Phaser.AUTO,
    width: 800,
    height: 450,
    parent: "app",
    backgroundColor: "#1e1e1e",
    scene: [AuthScene, MainScene], // AuthScene arranca primero
});
