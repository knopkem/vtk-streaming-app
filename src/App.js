import React, { Component } from "react";
import "./App.css";

import vtkFullScreenRenderWindow from "vtk.js/Sources/Rendering/Misc/FullScreenRenderWindow";
import vtkImageStream from "vtk.js/Sources/IO/Core/ImageStream";
import SmartConnect from "wslink/src/SmartConnect";

import vtkOrientationMarkerWidget from "vtk.js/Sources/Interaction/Widgets/OrientationMarkerWidget";
import vtkAnnotatedCubeActor from "vtk.js/Sources/Rendering/Core/AnnotatedCubeActor";

class App extends Component {
  constructor(props) {
    super(props);

    this.fullScreenRenderer = null;
    this.container = React.createRef();
  }

  updatePipeline() {
    const renderer = this.fullScreenRenderer.getRenderer();
    const renderWindow = this.fullScreenRenderer.getRenderWindow();

    const imageStream = vtkImageStream.newInstance();

    // run paraview server (with python bindings): pvpython pv_server.py --port 9999
    const config = { sessionURL: "ws://localhost:9999/ws" };
    const smartConnect = SmartConnect.newInstance({ config });
    smartConnect.onConnectionReady((connection) => {
      // Network
      const session = connection.getSession();

      // Image
      imageStream.connect(session);
      const viewStream = imageStream.createViewStream("-1");
      this.fullScreenRenderer.getOpenGLRenderWindow().setViewStream(viewStream);

      // Configure image quality
      viewStream.setInteractiveQuality(75);
      viewStream.setInteractiveRatio(0.5);
      viewStream.setCamera(renderer.getActiveCamera());
      viewStream.pushCamera();

      // Bind user input
      renderWindow
        .getInteractor()
        .onStartAnimation(viewStream.startInteraction);
      renderWindow.getInteractor().onEndAnimation(viewStream.endInteraction);
    });

    smartConnect.onConnectionError(console.error);
    smartConnect.onConnectionClose(console.error);
    smartConnect.connect();

    // ----------------------------------------------------------------------------
    // Local rendering setup (as overlay)
    // ----------------------------------------------------------------------------

    const axes = vtkAnnotatedCubeActor.newInstance();
    axes.setDefaultStyle({
      text: "+X",
      fontStyle: "bold",
      fontFamily: "Arial",
      fontColor: "black",
      fontSizeScale: (res) => res / 2,
      faceColor: "#0000ff",
      faceRotation: 0,
      edgeThickness: 0.1,
      edgeColor: "black",
      resolution: 400,
    });
    // axes.setXPlusFaceProperty({ text: '+X' });
    axes.setXMinusFaceProperty({
      text: "-X",
      faceColor: "#ffff00",
      faceRotation: 90,
      fontStyle: "italic",
    });
    axes.setYPlusFaceProperty({
      text: "+Y",
      faceColor: "#00ff00",
      fontSizeScale: (res) => res / 4,
    });
    axes.setYMinusFaceProperty({
      text: "-Y",
      faceColor: "#00ffff",
      fontColor: "white",
    });
    axes.setZPlusFaceProperty({
      text: "+Z",
      edgeColor: "yellow",
    });
    axes.setZMinusFaceProperty({
      text: "-Z",
      faceRotation: 45,
      edgeThickness: 0,
    });

    // create orientation widget
    const orientationWidget = vtkOrientationMarkerWidget.newInstance({
      actor: axes,
      interactor: renderWindow.getInteractor(),
    });
    orientationWidget.setEnabled(true);
    orientationWidget.setViewportCorner(
      vtkOrientationMarkerWidget.Corners.BOTTOM_RIGHT
    );
    orientationWidget.setViewportSize(0.15);
    orientationWidget.setMinPixelSize(100);
    orientationWidget.setMaxPixelSize(300);

    renderer.resetCamera();
    renderWindow.render();

    global.renderWindow = renderWindow;
  }

  componentDidMount() {
    this.fullScreenRenderer = vtkFullScreenRenderWindow.newInstance();
    this.updatePipeline();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resolution !== this.props.resolution) {
      this.updatePipeline();
    }
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <div ref={this.container} />
        </header>
      </div>
    );
  }
}

export default App;
