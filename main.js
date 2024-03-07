import * as cornerstone from './cornerstone3D/packages/core';
import { volumeLoader, utilities } from './cornerstone3D/packages/core';
import {
    addTool,
    BidirectionalTool,
    BrushTool,
    RectangleROITool,
    RectangleScissorsTool,
    PanTool,
    ZoomTool,
    StackScrollMouseWheelTool,
    VolumeRotateMouseWheelTool,
    TrackballRotateTool,
    ToolGroupManager,
    Enums as csToolsEnums,
    init as csToolsInit,
    annotation as csAnnotations,
    utilities as csUtilities,
    segmentation,
    SegmentationDisplayTool,
} from './cornerstone3D/packages/tools';
import dicomParser from 'dicom-parser';
import { api } from 'dicomweb-client';
import dcmjs from 'dcmjs';
// import * as test from './cornerstone3D/packages/dicomImageLoader';
// import cornerstoneDICOMImageLoader from './cornerstone3D/packages/dicomImageLoader';
import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import {
    cornerstoneStreamingImageVolumeLoader,
    cornerstoneStreamingDynamicImageVolumeLoader,
} from './cornerstone3D/packages/streaming-image-volume-loader';

let X;
let Y;
let Z;


async function runFunction() {
    await cornerstone.init();
    initCornerstoneDICOMImageLoader();
    initVolumeLoader();
    await csToolsInit();


    const series_instance_uid = getSeriesFromURL();

    // get demo imageIds
    // const imageIds = getTestImageIds();
    const imageIds = await getFilesForSeries(series_instance_uid);

    const content = document.getElementById('content');

    const viewportGrid = document.createElement('div');
    viewportGrid.style.display = 'flex';
    viewportGrid.style.flexDirection = 'row';

    // element for axial view
    const element1 = document.createElement('div');
    element1.style.width = '500px';
    element1.style.height = '500px';
    // disable right-click on this element
    element1.oncontextmenu = (e) => e.preventDefault();

    // element for sagittal view
    const element2 = document.createElement('div');
    element2.style.width = '500px';
    element2.style.height = '500px';
    // disable right-click on this element
    element2.oncontextmenu = (e) => e.preventDefault();

    // element for 3d view
    const element3 = document.createElement('div');
    element3.style.width = '500px';
    element3.style.height = '500px';
    // disable right-click on this element
    element3.oncontextmenu = (e) => e.preventDefault();

    viewportGrid.appendChild(element1);
    viewportGrid.appendChild(element2);
    viewportGrid.appendChild(element3);

    content.appendChild(viewportGrid);

    const renderingEngineId = 'myRenderingEngine';
    const renderingEngine = new cornerstone.RenderingEngine(renderingEngineId);

    // note we need to add the cornerstoneStreamingImageVolume: to
    // use the streaming volume loader
    const volumeId = 'cornerstoneStreamingImageVolume: myVolume';

    // Define a volume in memory
    const volume = await volumeLoader.createAndCacheVolume(volumeId, {
      imageIds,
    });

    const viewportId1 = 'CT_CORONAL';
    const viewportId2 = 'CT_SAGITTAL';
    const viewportId3 = 'CT_3D';

    const viewportInput = [
      {
        viewportId: viewportId1,
        element: element1,
        type: cornerstone.Enums.ViewportType.ORTHOGRAPHIC,
        defaultOptions: {
          orientation: cornerstone.Enums.OrientationAxis.CORONAL,
          VOILUTFunction: cornerstone.Enums.VOILUTFunctionType.LINEAR,
        },
      },
      {
        viewportId: viewportId2,
        element: element2,
        type: cornerstone.Enums.ViewportType.ORTHOGRAPHIC,
        defaultOptions: {
          orientation: cornerstone.Enums.OrientationAxis.SAGITTAL,
        },
      },
      {
        viewportId: viewportId3,
        element: element3,
        type: cornerstone.Enums.ViewportType.VOLUME_3D,
        defaultOptions: {
          orientation: cornerstone.Enums.OrientationAxis.SAGITTAL,
        },
      },
    ];

    renderingEngine.setViewports(viewportInput);

    addTool(RectangleROITool);
    addTool(RectangleScissorsTool);
    addTool(StackScrollMouseWheelTool);
    //addTool(VolumeRotateMouseWheelTool);
    addTool(PanTool);
    addTool(ZoomTool);
    addTool(TrackballRotateTool);
    addTool(SegmentationDisplayTool);
    // addTool(BrushTool);

    const toolGroupId = 'myToolGroup';
    const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
    toolGroup.addTool(StackScrollMouseWheelTool.toolName);
    // toolGroup.addTool(VolumeRotateMouseWheelTool.toolName);
    // toolGroup.addTool(RectangleROITool.toolName, {
    //     getTextLines: () => {}
    // });
    toolGroup.addTool(RectangleScissorsTool.toolName);
    toolGroup.addTool(PanTool.toolName);
    toolGroup.addTool(ZoomTool.toolName);
    toolGroup.addTool(SegmentationDisplayTool.toolName);
    // toolGroup.addToolInstance('SphereBrush', BrushTool.toolName, {
    //     activeStrategy: 'FILL_INSIDE_SPHERE',
    // });
    toolGroup.setToolEnabled(SegmentationDisplayTool.toolName);

    toolGroup.addViewport(viewportId1, renderingEngineId);
    toolGroup.addViewport(viewportId2, renderingEngineId);
    // toolGroup.addViewport(viewportId3, renderingEngineId);

    toolGroup.setToolActive(RectangleScissorsTool.toolName, {
    // toolGroup.setToolActive('SphereBrush', {
        bindings: [
            {
                mouseButton: csToolsEnums.MouseBindings.Primary,
            },
        ]
    });
    toolGroup.setToolActive(PanTool.toolName, {
        bindings: [
            {
                mouseButton: csToolsEnums.MouseBindings.Auxiliary,
            },
        ]
    });
    toolGroup.setToolActive(ZoomTool.toolName, {
        bindings: [
            {
                mouseButton: csToolsEnums.MouseBindings.Secondary,
            },
        ]
    });

    toolGroup.setToolActive(StackScrollMouseWheelTool.toolName);

    // -----------------------------------------------------------------------
    // second toolGroup, for the 3d view
    // -----------------------------------------------------------------------

    const toolGroupId2 = 'my3dToolGroup';
    const toolGroup2 = ToolGroupManager.createToolGroup(toolGroupId2);

    toolGroup2.addTool(TrackballRotateTool.toolName);
    toolGroup2.addTool(SegmentationDisplayTool.toolName);
    toolGroup2.setToolEnabled(SegmentationDisplayTool.toolName);

    toolGroup2.addViewport(viewportId3, renderingEngineId);

    toolGroup2.setToolActive(TrackballRotateTool.toolName, {
        bindings: [
            {
                mouseButton: csToolsEnums.MouseBindings.Primary,
            },
        ]
    });

    // Set the volume to load
    volume.load();

    cornerstone.setVolumesForViewports(
      renderingEngine,
      [
          { 
              volumeId,
              // callback: ({ volumeActor }) => {
              //     volumeActor
              //       .getProperty()
              //       .getRGBTransferFunction(0)
              //       .setMappingRange(-180, 220);
              // },
              // blendMode: cornerstone.Enums.BlendModes.MAXIMUM_INTENSITY_BLEND,
              slabThickness: 0.1,
          }
      ],
      [viewportId1, viewportId2]
    );

    cornerstone.setVolumesForViewports(renderingEngine, [{ volumeId }], [viewportId3]).then(
        () => {
            const viewport = renderingEngine
                .getViewport(viewportId3);
            const volumeActor = viewport
                .getDefaultActor().actor;

            utilities.applyPreset(
                volumeActor,
                cornerstone.CONSTANTS.VIEWPORT_PRESETS.find((preset) => preset.name === 'CT-Soft-Tissue')
            );

            viewport.render();
        }
    );


    const newSegmentationId = 'newseg1';

    // --- segmentation stuff? ---
    // I think we need to add a "segmentation" object so the scissor tool
    // has somehwere to store the result?
    //
    //

    await volumeLoader.createAndCacheDerivedSegmentationVolume(volumeId, {
        volumeId: newSegmentationId,
    });

    segmentation.addSegmentations([
      {
        segmentationId: newSegmentationId,
        representation: {
          type: csToolsEnums.SegmentationRepresentations.Labelmap,
          data: {
            // imageIdReferenceMap: new Map([['currentid', 'newid']]),
            volumeId: newSegmentationId,
          },
        },
      },
    ]);

    await segmentation.addSegmentationRepresentations(
      toolGroupId,
      [
        {
          segmentationId: newSegmentationId,
          type: csToolsEnums.SegmentationRepresentations.Labelmap,
        },
      ]
    );

    // await segmentation.addSegmentationRepresentations(
    //   toolGroupId2,
    //   [
    //     {
    //       segmentationId: newSegmentationId,
    //       type: csToolsEnums.SegmentationRepresentations.Labelmap,
    //       // type: csToolsEnums.SegmentationRepresentations.Surface,
    //       // options: {
    //       //     polySeg: {
    //       //         enabled: true,
    //       //     }
    //       // }
    //     },
    //   ]
    // );


    // Render the image
    renderingEngine.renderViewports([viewportId1, viewportId2]);

    console.log(csAnnotations);
    window.annotation = csAnnotations;
    window.element1 = element1;
    window.qdims = function() {
        // Extracting the coordinates of the corners of the top face
        const topLeft = [X.min, Y.min, Z.max];
        const topRight = [X.max, Y.min, Z.max];
        const bottomLeft = [X.min, Y.max, Z.max];
        const bottomRight = [X.max, Y.max, Z.max];

        const topFaceCorners = [topLeft, topRight, bottomLeft, bottomRight];

        console.log("Coordinates of the corners of the top face:", topFaceCorners);

        // Calculate the center point
        const centerX = (topLeft[0] + topRight[0] + bottomLeft[0] + bottomRight[0]) / 4;
        const centerY = (topLeft[1] + topRight[1] + bottomLeft[1] + bottomRight[1]) / 4;
        const centerZ = (topLeft[2] + topRight[2] + bottomLeft[2] + bottomRight[2]) / 4;

        const centerPoint = [centerX, centerY, centerZ];

        console.log("Center point of the top face:", centerPoint);

        function calculateDistance(point1, point2) {
            const dx = point2[0] - point1[0];
            const dy = point2[1] - point1[1];
            const dz = point2[2] - point1[2];

            const distance = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);

            return distance;
        }

        const radius = calculateDistance(topFaceCorners[0], centerPoint);
        const height = Z.max - Z.min;

        // const topLeft = [X.min, Y.min, Z.max];
        // const topRight = [X.max, Y.min, Z.max];
        // const bottomLeft = [X.min, Y.max, Z.max];
        // const bottomRight = [X.max, Y.max, Z.max];

        // output info
        document.getElementById("output").innerHTML = `
        <h3>Redaction input (black box)</h3>
        <table>
        <tr>
            <td>Top left</td>
            <td>${topLeft}</td>
        </tr>
        <tr>
            <td>Top right</td>
            <td>${topRight}</td>
        </tr>
        <tr>
            <td>Bottom Left</td>
            <td>${bottomLeft}</td>
        </tr>
        <tr>
            <td>Bottom Right</td>
            <td>${bottomRight}</td>
        </tr>
        </table>

        <h3>Masker input</h3>
        <table>
        <tr>
            <td>center</td>
            <td>${centerPoint}</td>
        </tr>
        <tr>
            <td>radius</td>
            <td>${radius}</td>
        </tr>
        <tr>
            <td>height</td>
            <td>${height}</td>
        </tr>
        </table>

        `;
    }
    window.qreset = async function() {
        const segmentationVolume = cornerstone.cache.getVolume(newSegmentationId);
        const scalarData = segmentationVolume.scalarData;
        scalarData.fill(0); // set entire array to 0s

        // Let the system know the seg data has been modified
        segmentation.triggerSegmentationEvents.triggerSegmentationDataModified(newSegmentationId);
    }
    window.qtest = async function() {
        const segmentationVolume = cornerstone.cache.getVolume(newSegmentationId);
        const scalarData = segmentationVolume.scalarData;
        console.log(segmentationVolume.dimensions);
        const dims = segmentationVolume.dimensions;

        const z_size = dims[2];
        const y_size = dims[1];
        const x_size = dims[0];

        let xmin = z_size * y_size * x_size;
        let xmax = 0;
        let ymin = xmin;
        let ymax = 0;
        let zmin = xmin;
        let zmax = 0;

        for (let z = 0; z < z_size; z++) {
            for (let y = 0; y < y_size; y++) {
                for (let x = 0; x < x_size; x++) {
                    // offset into the array
                    let offset = (z * x_size * y_size) + (y * x_size) + x;

                    if (scalarData[offset] > 0) {
                        // console.log(x, y, z);
                        if (x < xmin) { xmin = x; }
                        if (x > xmax) { xmax = x; }
                        if (y < ymin) { ymin = y; }
                        if (y > ymax) { ymax = y; }
                        if (z < zmin) { zmin = z; }
                        if (z > zmax) { zmax = z; }
                    }
                }
            }
        }

        // These would be the points that bound the volume
        // console.log("x", xmin, xmax);
        // console.log("y", ymin, ymax);
        // console.log("z", zmin, zmax);

        X = { min: xmin, max: xmax };
        Y = { min: ymin, max: ymax };
        Z = { min: zmin, max: zmax };

        // console.log(X);
        // console.log(Y);
        // console.log(Z);

        for (let z = 0; z < z_size; z++) {
            for (let y = 0; y < y_size; y++) {
                for (let x = 0; x < x_size; x++) {
                    // offset into the array
                    let offset = (z * x_size * y_size) + (y * x_size) + x;
                    if (
                        x >= xmin &&
                        x <= xmax &&
                        y >= ymin &&
                        y <= ymax &&
                        z >= zmin &&
                        z <= zmax
                    ) {
                        scalarData[offset] = 2;
                    } else {
                        scalarData[offset] = 0;
                    }
                }
            }
        }

        // Let the system know the seg data has been modified
        segmentation.triggerSegmentationEvents.triggerSegmentationDataModified(newSegmentationId);

        window.qdims();


    }
    window.q3d = async function() {
        await segmentation.addSegmentationRepresentations(toolGroupId2, [
            {
                segmentationId: newSegmentationId,
                type: csToolsEnums.SegmentationRepresentations.Surface,
                options: {
                    polySeg: {
                        enabled: true,
                    },
                },
            },
        ]);
    }
    window.qtest_old = function() {
        const manager = csAnnotations.state.getAnnotationManager();

        console.log(manager.getNumberOfAllAnnotations());

        // collection of all annotations
        console.log(manager.annotations);

        const framesOfReference = Object.keys(manager.annotations);
        console.log(framesOfReference);

        const firstFOR = framesOfReference[0]; // there will probably only be one anyway

        const rectangleROIs = manager.annotations[firstFOR].RectangleROI;

        console.log(rectangleROIs);

        rectangleROIs.forEach((roi) => {
            console.log(roi);
        });

        console.log(csUtilities.segmentation);
    }

    window.doStuff = function() {
        const viewport1 = renderingEngine.getViewport(viewportId1);
        const viewport2 = renderingEngine.getViewport(viewportId2);

        viewport1.setProperties({
              VOILUTFunction: cornerstone.Enums.VOILUTFunctionType.SAMPLED_SIGMOID,
        });
        viewport2.setProperties({
              VOILUTFunction: cornerstone.Enums.VOILUTFunctionType.SAMPLED_SIGMOID,
        });

    }

}

function getSeriesFromURL() {
    // Extract the series parameter from the URL in the browser
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);

    const series = urlParams.get('series');
    console.log(series);

    return series;
}

function initVolumeLoader() {
    volumeLoader.registerUnknownVolumeLoader(
        cornerstoneStreamingImageVolumeLoader
    );
    volumeLoader.registerVolumeLoader(
        'cornerstoneStreamingImageVolume',
        cornerstoneStreamingImageVolumeLoader
    );
    volumeLoader.registerVolumeLoader(
        'cornerstoneStreamingDynamicImageVolume',
        cornerstoneStreamingDynamicImageVolumeLoader
    );
}


function initCornerstoneDICOMImageLoader() {
  const { preferSizeOverAccuracy, useNorm16Texture } = cornerstone.getConfiguration().rendering;
  cornerstoneDICOMImageLoader.external.cornerstone = cornerstone;
  cornerstoneDICOMImageLoader.external.dicomParser = dicomParser;
  cornerstoneDICOMImageLoader.configure({
    useWebWorkers: true,
    decodeConfig: {
      convertFloatPixelDataToInt: false,
      use16BitDataType: preferSizeOverAccuracy || useNorm16Texture,
    },
  });

  let maxWebWorkers = 1;

  if (navigator.hardwareConcurrency) {
    maxWebWorkers = Math.min(navigator.hardwareConcurrency, 7);
  }

  var config = {
    maxWebWorkers,
    startWebWorkersOnDemand: false,
    taskConfiguration: {
      decodeTask: {
    initializeCodecsOnStartup: false,
    strict: false,
      },
    },
  };

  cornerstoneDICOMImageLoader.webWorkerManager.initialize(config);
}

async function getFilesForSeries(series) {
    console.log("getFilesForSeries");
    console.log(series);
    const response = await fetch(`/papi/v1/series/${series}/files`);
    const files = await response.json();
    // console.log(files.file_ids);

    // files.file_ids.forEach((fileid) => {
    //     console.log(fileid);
    // });

    const newfiles = files.file_ids.map((file_id) => {
        return "wadouri:/papi/v1/files/" + file_id + "/data";
    });

    return newfiles;
}

runFunction();

// vim: ts=4 sw=4 expandtab foldmethod=marker
