import * as cornerstone from '@cornerstonejs/core';
import { volumeLoader, utilities } from '@cornerstonejs/core';
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
} from '@cornerstonejs/tools';
import dicomParser from 'dicom-parser';
import { api } from 'dicomweb-client';
import dcmjs from 'dcmjs';
import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import {
    cornerstoneStreamingImageVolumeLoader,
    cornerstoneStreamingDynamicImageVolumeLoader,
} from '@cornerstonejs/streaming-image-volume-loader';

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

// These are all just test functions for loading local images. Probably ignore 
function getTestImageIds() {//{{{
    return [
        'wadouri:/dicom3/1-001.dcm',
        'wadouri:/dicom3/1-002.dcm',
        'wadouri:/dicom3/1-003.dcm',
        'wadouri:/dicom3/1-004.dcm',
        'wadouri:/dicom3/1-005.dcm',
        'wadouri:/dicom3/1-006.dcm',
        'wadouri:/dicom3/1-007.dcm',
        'wadouri:/dicom3/1-008.dcm',
        'wadouri:/dicom3/1-009.dcm',
        'wadouri:/dicom3/1-010.dcm',
        'wadouri:/dicom3/1-011.dcm',
        'wadouri:/dicom3/1-012.dcm',
        'wadouri:/dicom3/1-013.dcm',
        'wadouri:/dicom3/1-014.dcm',
        'wadouri:/dicom3/1-015.dcm',
        'wadouri:/dicom3/1-016.dcm',
        'wadouri:/dicom3/1-017.dcm',
        'wadouri:/dicom3/1-018.dcm',
        'wadouri:/dicom3/1-019.dcm',
        'wadouri:/dicom3/1-020.dcm',
        'wadouri:/dicom3/1-021.dcm',
        'wadouri:/dicom3/1-022.dcm',
        'wadouri:/dicom3/1-023.dcm',
        'wadouri:/dicom3/1-024.dcm',
        'wadouri:/dicom3/1-025.dcm',
        'wadouri:/dicom3/1-026.dcm',
        'wadouri:/dicom3/1-027.dcm',
        'wadouri:/dicom3/1-028.dcm',
        'wadouri:/dicom3/1-029.dcm',
        'wadouri:/dicom3/1-030.dcm',
        'wadouri:/dicom3/1-031.dcm',
        'wadouri:/dicom3/1-032.dcm',
        'wadouri:/dicom3/1-033.dcm',
        'wadouri:/dicom3/1-034.dcm',
        'wadouri:/dicom3/1-035.dcm',
        'wadouri:/dicom3/1-036.dcm',
        'wadouri:/dicom3/1-037.dcm',
        'wadouri:/dicom3/1-038.dcm',
        'wadouri:/dicom3/1-039.dcm',
        'wadouri:/dicom3/1-040.dcm',
        'wadouri:/dicom3/1-041.dcm',
        'wadouri:/dicom3/1-042.dcm',
        'wadouri:/dicom3/1-043.dcm',
        'wadouri:/dicom3/1-044.dcm',
        'wadouri:/dicom3/1-045.dcm',
        'wadouri:/dicom3/1-046.dcm',
        'wadouri:/dicom3/1-047.dcm',
        'wadouri:/dicom3/1-048.dcm',
        'wadouri:/dicom3/1-049.dcm',
        'wadouri:/dicom3/1-050.dcm',
        'wadouri:/dicom3/1-051.dcm',
        'wadouri:/dicom3/1-052.dcm',
        'wadouri:/dicom3/1-053.dcm',
        'wadouri:/dicom3/1-054.dcm',
        'wadouri:/dicom3/1-055.dcm',
        'wadouri:/dicom3/1-056.dcm',
        'wadouri:/dicom3/1-057.dcm',
        'wadouri:/dicom3/1-058.dcm',
        'wadouri:/dicom3/1-059.dcm',
        'wadouri:/dicom3/1-060.dcm',
        'wadouri:/dicom3/1-061.dcm',
        'wadouri:/dicom3/1-062.dcm',
        'wadouri:/dicom3/1-063.dcm',
        'wadouri:/dicom3/1-064.dcm',
        'wadouri:/dicom3/1-065.dcm',
        'wadouri:/dicom3/1-066.dcm',
        'wadouri:/dicom3/1-067.dcm',
        'wadouri:/dicom3/1-068.dcm',
        'wadouri:/dicom3/1-069.dcm',
        'wadouri:/dicom3/1-070.dcm',
        'wadouri:/dicom3/1-071.dcm',
        'wadouri:/dicom3/1-072.dcm',
        'wadouri:/dicom3/1-073.dcm',
        'wadouri:/dicom3/1-074.dcm',
        'wadouri:/dicom3/1-075.dcm',
        'wadouri:/dicom3/1-076.dcm',
        'wadouri:/dicom3/1-077.dcm',
        'wadouri:/dicom3/1-078.dcm',
        'wadouri:/dicom3/1-079.dcm',
        'wadouri:/dicom3/1-080.dcm',
        'wadouri:/dicom3/1-081.dcm',
        'wadouri:/dicom3/1-082.dcm',
        'wadouri:/dicom3/1-083.dcm',
        'wadouri:/dicom3/1-084.dcm',
        'wadouri:/dicom3/1-085.dcm',
        'wadouri:/dicom3/1-086.dcm',
        'wadouri:/dicom3/1-087.dcm',
        'wadouri:/dicom3/1-088.dcm',
        'wadouri:/dicom3/1-089.dcm',
        'wadouri:/dicom3/1-090.dcm',
        'wadouri:/dicom3/1-091.dcm',
        'wadouri:/dicom3/1-092.dcm',
        'wadouri:/dicom3/1-093.dcm',
        'wadouri:/dicom3/1-094.dcm',
        'wadouri:/dicom3/1-095.dcm',
        'wadouri:/dicom3/1-096.dcm',
        'wadouri:/dicom3/1-097.dcm',
        'wadouri:/dicom3/1-098.dcm',
        'wadouri:/dicom3/1-099.dcm',
        'wadouri:/dicom3/1-100.dcm',
        'wadouri:/dicom3/1-101.dcm',
        'wadouri:/dicom3/1-102.dcm',
        'wadouri:/dicom3/1-103.dcm',
        'wadouri:/dicom3/1-104.dcm',
        'wadouri:/dicom3/1-105.dcm',
        'wadouri:/dicom3/1-106.dcm',
        'wadouri:/dicom3/1-107.dcm',
        'wadouri:/dicom3/1-108.dcm',
        'wadouri:/dicom3/1-109.dcm',
        'wadouri:/dicom3/1-110.dcm',
        'wadouri:/dicom3/1-111.dcm',
        'wadouri:/dicom3/1-112.dcm',
        'wadouri:/dicom3/1-113.dcm',
        'wadouri:/dicom3/1-114.dcm',
        'wadouri:/dicom3/1-115.dcm',
        'wadouri:/dicom3/1-116.dcm',
        'wadouri:/dicom3/1-117.dcm',
        'wadouri:/dicom3/1-118.dcm',
        'wadouri:/dicom3/1-119.dcm',
        'wadouri:/dicom3/1-120.dcm',
        'wadouri:/dicom3/1-121.dcm',
        'wadouri:/dicom3/1-122.dcm',
        'wadouri:/dicom3/1-123.dcm',
        'wadouri:/dicom3/1-124.dcm',
        'wadouri:/dicom3/1-125.dcm',
        'wadouri:/dicom3/1-126.dcm',
        'wadouri:/dicom3/1-127.dcm',
        'wadouri:/dicom3/1-128.dcm',
        'wadouri:/dicom3/1-129.dcm',
        'wadouri:/dicom3/1-130.dcm',
        'wadouri:/dicom3/1-131.dcm',
        'wadouri:/dicom3/1-132.dcm',
        'wadouri:/dicom3/1-133.dcm',
        'wadouri:/dicom3/1-134.dcm',
        'wadouri:/dicom3/1-135.dcm',
        'wadouri:/dicom3/1-136.dcm',
        'wadouri:/dicom3/1-137.dcm',
        'wadouri:/dicom3/1-138.dcm',
        'wadouri:/dicom3/1-139.dcm',
        'wadouri:/dicom3/1-140.dcm',
        'wadouri:/dicom3/1-141.dcm',
        'wadouri:/dicom3/1-142.dcm',
        'wadouri:/dicom3/1-143.dcm',
        'wadouri:/dicom3/1-144.dcm',
        'wadouri:/dicom3/1-145.dcm',
        'wadouri:/dicom3/1-146.dcm',
        'wadouri:/dicom3/1-147.dcm',
        'wadouri:/dicom3/1-148.dcm',
        'wadouri:/dicom3/1-149.dcm',
        'wadouri:/dicom3/1-150.dcm',
        'wadouri:/dicom3/1-151.dcm',
        'wadouri:/dicom3/1-152.dcm',
        'wadouri:/dicom3/1-153.dcm',
        'wadouri:/dicom3/1-154.dcm',
        'wadouri:/dicom3/1-155.dcm',
        'wadouri:/dicom3/1-156.dcm',
        'wadouri:/dicom3/1-157.dcm',
        'wadouri:/dicom3/1-158.dcm',
        'wadouri:/dicom3/1-159.dcm',
        'wadouri:/dicom3/1-160.dcm',
        'wadouri:/dicom3/1-161.dcm',
        'wadouri:/dicom3/1-162.dcm',
        'wadouri:/dicom3/1-163.dcm',
        'wadouri:/dicom3/1-164.dcm',
        'wadouri:/dicom3/1-165.dcm',
        'wadouri:/dicom3/1-166.dcm',
        'wadouri:/dicom3/1-167.dcm',
        'wadouri:/dicom3/1-168.dcm',
        'wadouri:/dicom3/1-169.dcm',
        'wadouri:/dicom3/1-170.dcm',
        'wadouri:/dicom3/1-171.dcm',
        'wadouri:/dicom3/1-172.dcm',
        'wadouri:/dicom3/1-173.dcm',
        'wadouri:/dicom3/1-174.dcm',
        'wadouri:/dicom3/1-175.dcm',
        'wadouri:/dicom3/1-176.dcm',
        'wadouri:/dicom3/1-177.dcm',
        'wadouri:/dicom3/1-178.dcm',
        'wadouri:/dicom3/1-179.dcm',
        'wadouri:/dicom3/1-180.dcm',
        'wadouri:/dicom3/1-181.dcm',
        'wadouri:/dicom3/1-182.dcm',
        'wadouri:/dicom3/1-183.dcm',
        'wadouri:/dicom3/1-184.dcm',
        'wadouri:/dicom3/1-185.dcm',
        'wadouri:/dicom3/1-186.dcm',
        'wadouri:/dicom3/1-187.dcm',
        'wadouri:/dicom3/1-188.dcm',
        'wadouri:/dicom3/1-189.dcm',
        'wadouri:/dicom3/1-190.dcm',
        'wadouri:/dicom3/1-191.dcm',
        'wadouri:/dicom3/1-192.dcm',
        'wadouri:/dicom3/1-193.dcm',
        'wadouri:/dicom3/1-194.dcm',
        'wadouri:/dicom3/1-195.dcm',
        'wadouri:/dicom3/1-196.dcm',
        'wadouri:/dicom3/1-197.dcm',
        'wadouri:/dicom3/1-198.dcm',
        'wadouri:/dicom3/1-199.dcm',
        'wadouri:/dicom3/1-200.dcm',
        'wadouri:/dicom3/1-201.dcm',
        'wadouri:/dicom3/1-202.dcm',
        'wadouri:/dicom3/1-203.dcm',
        'wadouri:/dicom3/1-204.dcm',
        'wadouri:/dicom3/1-205.dcm',
        'wadouri:/dicom3/1-206.dcm',
        'wadouri:/dicom3/1-207.dcm',
        'wadouri:/dicom3/1-208.dcm',
        'wadouri:/dicom3/1-209.dcm',
        'wadouri:/dicom3/1-210.dcm',
        'wadouri:/dicom3/1-211.dcm',
        'wadouri:/dicom3/1-212.dcm',
        'wadouri:/dicom3/1-213.dcm',
        'wadouri:/dicom3/1-214.dcm',
        'wadouri:/dicom3/1-215.dcm',
        'wadouri:/dicom3/1-216.dcm',
        'wadouri:/dicom3/1-217.dcm',
        'wadouri:/dicom3/1-218.dcm',
        'wadouri:/dicom3/1-219.dcm',
        'wadouri:/dicom3/1-220.dcm',
        'wadouri:/dicom3/1-221.dcm',
        'wadouri:/dicom3/1-222.dcm',
        'wadouri:/dicom3/1-223.dcm',
        'wadouri:/dicom3/1-224.dcm',
        'wadouri:/dicom3/1-225.dcm',
        'wadouri:/dicom3/1-226.dcm',
        'wadouri:/dicom3/1-227.dcm',
        'wadouri:/dicom3/1-228.dcm',
        'wadouri:/dicom3/1-229.dcm',
        'wadouri:/dicom3/1-230.dcm',
        'wadouri:/dicom3/1-231.dcm',
        'wadouri:/dicom3/1-232.dcm',
        'wadouri:/dicom3/1-233.dcm',
        'wadouri:/dicom3/1-234.dcm',
        'wadouri:/dicom3/1-235.dcm',
        'wadouri:/dicom3/1-236.dcm',
        'wadouri:/dicom3/1-237.dcm',
        'wadouri:/dicom3/1-238.dcm',
        'wadouri:/dicom3/1-239.dcm',
        'wadouri:/dicom3/1-240.dcm',
        'wadouri:/dicom3/1-241.dcm',
        'wadouri:/dicom3/1-242.dcm',
        'wadouri:/dicom3/1-243.dcm',
        'wadouri:/dicom3/1-244.dcm',
        'wadouri:/dicom3/1-245.dcm',
        'wadouri:/dicom3/1-246.dcm',
        'wadouri:/dicom3/1-247.dcm',
        'wadouri:/dicom3/1-248.dcm',
        'wadouri:/dicom3/1-249.dcm',
        'wadouri:/dicom3/1-250.dcm',
        'wadouri:/dicom3/1-251.dcm',
        'wadouri:/dicom3/1-252.dcm',
        'wadouri:/dicom3/1-253.dcm',
        'wadouri:/dicom3/1-254.dcm',
        'wadouri:/dicom3/1-255.dcm',
        'wadouri:/dicom3/1-256.dcm',
        'wadouri:/dicom3/1-257.dcm',
        'wadouri:/dicom3/1-258.dcm',
        'wadouri:/dicom3/1-259.dcm',
        'wadouri:/dicom3/1-260.dcm',
        'wadouri:/dicom3/1-261.dcm',
        'wadouri:/dicom3/1-262.dcm',
        'wadouri:/dicom3/1-263.dcm',
        'wadouri:/dicom3/1-264.dcm',
        'wadouri:/dicom3/1-265.dcm',
        'wadouri:/dicom3/1-266.dcm',
        'wadouri:/dicom3/1-267.dcm',
        'wadouri:/dicom3/1-268.dcm',
        'wadouri:/dicom3/1-269.dcm',
        'wadouri:/dicom3/1-270.dcm',
        'wadouri:/dicom3/1-271.dcm',
        'wadouri:/dicom3/1-272.dcm',
        'wadouri:/dicom3/1-273.dcm',
        'wadouri:/dicom3/1-274.dcm',
        'wadouri:/dicom3/1-275.dcm',
        'wadouri:/dicom3/1-276.dcm',
        'wadouri:/dicom3/1-277.dcm',
        'wadouri:/dicom3/1-278.dcm',
        'wadouri:/dicom3/1-279.dcm',
        'wadouri:/dicom3/1-280.dcm',
        'wadouri:/dicom3/1-281.dcm',
        'wadouri:/dicom3/1-282.dcm',
        'wadouri:/dicom3/1-283.dcm',
        'wadouri:/dicom3/1-284.dcm',
        'wadouri:/dicom3/1-285.dcm',
        'wadouri:/dicom3/1-286.dcm',
        'wadouri:/dicom3/1-287.dcm',
        'wadouri:/dicom3/1-288.dcm',
        'wadouri:/dicom3/1-289.dcm',
        'wadouri:/dicom3/1-290.dcm',
        'wadouri:/dicom3/1-291.dcm',
        'wadouri:/dicom3/1-292.dcm',
        'wadouri:/dicom3/1-293.dcm',
        'wadouri:/dicom3/1-294.dcm',
        'wadouri:/dicom3/1-295.dcm',
        'wadouri:/dicom3/1-296.dcm',
        'wadouri:/dicom3/1-297.dcm',
        'wadouri:/dicom3/1-298.dcm',
        'wadouri:/dicom3/1-299.dcm',
        'wadouri:/dicom3/1-300.dcm',
        'wadouri:/dicom3/1-301.dcm',
        'wadouri:/dicom3/1-302.dcm',
        'wadouri:/dicom3/1-303.dcm',
        'wadouri:/dicom3/1-304.dcm',
        'wadouri:/dicom3/1-305.dcm',
        'wadouri:/dicom3/1-306.dcm',
        'wadouri:/dicom3/1-307.dcm',
        'wadouri:/dicom3/1-308.dcm',
        'wadouri:/dicom3/1-309.dcm',
        'wadouri:/dicom3/1-310.dcm',
        'wadouri:/dicom3/1-311.dcm',
        'wadouri:/dicom3/1-312.dcm',
        'wadouri:/dicom3/1-313.dcm',
        'wadouri:/dicom3/1-314.dcm',
        'wadouri:/dicom3/1-315.dcm',
        'wadouri:/dicom3/1-316.dcm',
        'wadouri:/dicom3/1-317.dcm',
        'wadouri:/dicom3/1-318.dcm',
        'wadouri:/dicom3/1-319.dcm',
        'wadouri:/dicom3/1-320.dcm',
        'wadouri:/dicom3/1-321.dcm',
        'wadouri:/dicom3/1-322.dcm',
        'wadouri:/dicom3/1-323.dcm',
        'wadouri:/dicom3/1-324.dcm',
        'wadouri:/dicom3/1-325.dcm',
        'wadouri:/dicom3/1-326.dcm',
        'wadouri:/dicom3/1-327.dcm',
        'wadouri:/dicom3/1-328.dcm',
        'wadouri:/dicom3/1-329.dcm',
        'wadouri:/dicom3/1-330.dcm',
        'wadouri:/dicom3/1-331.dcm',
        'wadouri:/dicom3/1-332.dcm',
        'wadouri:/dicom3/1-333.dcm',
        'wadouri:/dicom3/1-334.dcm',
        'wadouri:/dicom3/1-335.dcm',
        'wadouri:/dicom3/1-336.dcm',
        'wadouri:/dicom3/1-337.dcm',
        'wadouri:/dicom3/1-338.dcm',
        'wadouri:/dicom3/1-339.dcm',
        'wadouri:/dicom3/1-340.dcm',
        'wadouri:/dicom3/1-341.dcm',
        'wadouri:/dicom3/1-342.dcm',
        'wadouri:/dicom3/1-343.dcm',
        'wadouri:/dicom3/1-344.dcm',
        'wadouri:/dicom3/1-345.dcm',
        'wadouri:/dicom3/1-346.dcm',
        'wadouri:/dicom3/1-347.dcm',
        'wadouri:/dicom3/1-348.dcm',
        'wadouri:/dicom3/1-349.dcm',
        'wadouri:/dicom3/1-350.dcm',
        'wadouri:/dicom3/1-351.dcm',
        'wadouri:/dicom3/1-352.dcm',
        'wadouri:/dicom3/1-353.dcm',
        'wadouri:/dicom3/1-354.dcm',
        'wadouri:/dicom3/1-355.dcm',
        'wadouri:/dicom3/1-356.dcm',
        'wadouri:/dicom3/1-357.dcm',
        'wadouri:/dicom3/1-358.dcm',
        'wadouri:/dicom3/1-359.dcm',
        'wadouri:/dicom3/1-360.dcm',
        'wadouri:/dicom3/1-361.dcm',
        'wadouri:/dicom3/1-362.dcm',
        'wadouri:/dicom3/1-363.dcm',
        'wadouri:/dicom3/1-364.dcm',
        'wadouri:/dicom3/1-365.dcm',
        'wadouri:/dicom3/1-366.dcm',
        'wadouri:/dicom3/1-367.dcm',
        'wadouri:/dicom3/1-368.dcm',
        'wadouri:/dicom3/1-369.dcm',
        'wadouri:/dicom3/1-370.dcm',
        'wadouri:/dicom3/1-371.dcm',
        'wadouri:/dicom3/1-372.dcm',
        'wadouri:/dicom3/1-373.dcm',
        'wadouri:/dicom3/1-374.dcm',
        'wadouri:/dicom3/1-375.dcm',
        'wadouri:/dicom3/1-376.dcm',
        'wadouri:/dicom3/1-377.dcm',
        'wadouri:/dicom3/1-378.dcm',
        'wadouri:/dicom3/1-379.dcm',
        'wadouri:/dicom3/1-380.dcm',
        'wadouri:/dicom3/1-381.dcm',
        'wadouri:/dicom3/1-382.dcm',
        'wadouri:/dicom3/1-383.dcm',
        'wadouri:/dicom3/1-384.dcm',
        'wadouri:/dicom3/1-385.dcm',
        'wadouri:/dicom3/1-386.dcm',
        'wadouri:/dicom3/1-387.dcm',
        'wadouri:/dicom3/1-388.dcm',
        'wadouri:/dicom3/1-389.dcm',
        'wadouri:/dicom3/1-390.dcm',
        'wadouri:/dicom3/1-391.dcm',
        'wadouri:/dicom3/1-392.dcm',
        'wadouri:/dicom3/1-393.dcm',
        'wadouri:/dicom3/1-394.dcm',
        'wadouri:/dicom3/1-395.dcm',
        'wadouri:/dicom3/1-396.dcm',
        'wadouri:/dicom3/1-397.dcm',
        'wadouri:/dicom3/1-398.dcm',
        'wadouri:/dicom3/1-399.dcm',
        'wadouri:/dicom3/1-400.dcm',
        'wadouri:/dicom3/1-401.dcm',
        'wadouri:/dicom3/1-402.dcm',
        'wadouri:/dicom3/1-403.dcm',
        'wadouri:/dicom3/1-404.dcm',
        'wadouri:/dicom3/1-405.dcm',
        'wadouri:/dicom3/1-406.dcm',
        'wadouri:/dicom3/1-407.dcm',
        'wadouri:/dicom3/1-408.dcm',
        'wadouri:/dicom3/1-409.dcm',
        'wadouri:/dicom3/1-410.dcm',
        'wadouri:/dicom3/1-411.dcm',
        'wadouri:/dicom3/1-412.dcm',
        'wadouri:/dicom3/1-413.dcm',
        'wadouri:/dicom3/1-414.dcm',
        'wadouri:/dicom3/1-415.dcm',
        'wadouri:/dicom3/1-416.dcm',
        'wadouri:/dicom3/1-417.dcm',
        'wadouri:/dicom3/1-418.dcm',
        'wadouri:/dicom3/1-419.dcm',
        'wadouri:/dicom3/1-420.dcm',
        'wadouri:/dicom3/1-421.dcm',
        'wadouri:/dicom3/1-422.dcm',
        'wadouri:/dicom3/1-423.dcm',
        'wadouri:/dicom3/1-424.dcm',
        'wadouri:/dicom3/1-425.dcm',
        'wadouri:/dicom3/1-426.dcm',
        'wadouri:/dicom3/1-427.dcm',
        'wadouri:/dicom3/1-428.dcm',
        'wadouri:/dicom3/1-429.dcm',
        'wadouri:/dicom3/1-430.dcm',
        'wadouri:/dicom3/1-431.dcm',
        'wadouri:/dicom3/1-432.dcm',
        'wadouri:/dicom3/1-433.dcm',
        'wadouri:/dicom3/1-434.dcm',
        'wadouri:/dicom3/1-435.dcm',
        'wadouri:/dicom3/1-436.dcm',
        'wadouri:/dicom3/1-437.dcm',
        'wadouri:/dicom3/1-438.dcm',
        'wadouri:/dicom3/1-439.dcm',
        'wadouri:/dicom3/1-440.dcm',
        'wadouri:/dicom3/1-441.dcm',
        'wadouri:/dicom3/1-442.dcm',
        'wadouri:/dicom3/1-443.dcm',
        'wadouri:/dicom3/1-444.dcm',
        'wadouri:/dicom3/1-445.dcm',
        'wadouri:/dicom3/1-446.dcm',
        'wadouri:/dicom3/1-447.dcm',
        'wadouri:/dicom3/1-448.dcm',
        'wadouri:/dicom3/1-449.dcm',
        'wadouri:/dicom3/1-450.dcm',
        'wadouri:/dicom3/1-451.dcm',
        'wadouri:/dicom3/1-452.dcm',
        'wadouri:/dicom3/1-453.dcm',
        'wadouri:/dicom3/1-454.dcm',
        'wadouri:/dicom3/1-455.dcm',
        'wadouri:/dicom3/1-456.dcm',
        'wadouri:/dicom3/1-457.dcm',
        'wadouri:/dicom3/1-458.dcm',
        'wadouri:/dicom3/1-459.dcm',
        'wadouri:/dicom3/1-460.dcm',
        'wadouri:/dicom3/1-461.dcm',
        'wadouri:/dicom3/1-462.dcm',
        'wadouri:/dicom3/1-463.dcm',
        'wadouri:/dicom3/1-464.dcm',
        'wadouri:/dicom3/1-465.dcm',
        'wadouri:/dicom3/1-466.dcm',
        'wadouri:/dicom3/1-467.dcm',
        'wadouri:/dicom3/1-468.dcm',
        'wadouri:/dicom3/1-469.dcm',
        'wadouri:/dicom3/1-470.dcm',
        'wadouri:/dicom3/1-471.dcm',
        'wadouri:/dicom3/1-472.dcm',
        'wadouri:/dicom3/1-473.dcm',
        'wadouri:/dicom3/1-474.dcm',
        'wadouri:/dicom3/1-475.dcm',
        'wadouri:/dicom3/1-476.dcm',
        'wadouri:/dicom3/1-477.dcm',
        'wadouri:/dicom3/1-478.dcm',
        'wadouri:/dicom3/1-479.dcm',
        'wadouri:/dicom3/1-480.dcm',
        'wadouri:/dicom3/1-481.dcm',
        'wadouri:/dicom3/1-482.dcm',
        'wadouri:/dicom3/1-483.dcm',
        'wadouri:/dicom3/1-484.dcm',
        'wadouri:/dicom3/1-485.dcm',
        'wadouri:/dicom3/1-486.dcm',
        'wadouri:/dicom3/1-487.dcm',
        'wadouri:/dicom3/1-488.dcm',
        'wadouri:/dicom3/1-489.dcm',
        'wadouri:/dicom3/1-490.dcm',
        'wadouri:/dicom3/1-491.dcm',
        'wadouri:/dicom3/1-492.dcm',
        'wadouri:/dicom3/1-493.dcm',
        'wadouri:/dicom3/1-494.dcm',
        'wadouri:/dicom3/1-495.dcm',
        'wadouri:/dicom3/1-496.dcm',
        'wadouri:/dicom3/1-497.dcm',
        'wadouri:/dicom3/1-498.dcm',
        'wadouri:/dicom3/1-499.dcm',
        'wadouri:/dicom3/1-500.dcm',
        'wadouri:/dicom3/1-501.dcm',
        'wadouri:/dicom3/1-502.dcm',
        'wadouri:/dicom3/1-503.dcm',
        'wadouri:/dicom3/1-504.dcm',
        'wadouri:/dicom3/1-505.dcm',
        'wadouri:/dicom3/1-506.dcm',
        'wadouri:/dicom3/1-507.dcm',
        'wadouri:/dicom3/1-508.dcm',
        'wadouri:/dicom3/1-509.dcm',
        'wadouri:/dicom3/1-510.dcm',
        'wadouri:/dicom3/1-511.dcm',
        'wadouri:/dicom3/1-512.dcm',
        'wadouri:/dicom3/1-513.dcm',
        'wadouri:/dicom3/1-514.dcm',
        'wadouri:/dicom3/1-515.dcm',
        'wadouri:/dicom3/1-516.dcm',
        'wadouri:/dicom3/1-517.dcm',
        'wadouri:/dicom3/1-518.dcm',
        'wadouri:/dicom3/1-519.dcm',
        'wadouri:/dicom3/1-520.dcm',
        'wadouri:/dicom3/1-521.dcm',
        'wadouri:/dicom3/1-522.dcm',
        'wadouri:/dicom3/1-523.dcm',
        'wadouri:/dicom3/1-524.dcm',
        'wadouri:/dicom3/1-525.dcm',
        'wadouri:/dicom3/1-526.dcm',
        'wadouri:/dicom3/1-527.dcm',
        'wadouri:/dicom3/1-528.dcm',
        'wadouri:/dicom3/1-529.dcm',
        'wadouri:/dicom3/1-530.dcm',
        'wadouri:/dicom3/1-531.dcm',
        'wadouri:/dicom3/1-532.dcm',
        'wadouri:/dicom3/1-533.dcm',
        'wadouri:/dicom3/1-534.dcm',
        'wadouri:/dicom3/1-535.dcm',
        'wadouri:/dicom3/1-536.dcm',
        'wadouri:/dicom3/1-537.dcm',
        'wadouri:/dicom3/1-538.dcm',
        'wadouri:/dicom3/1-539.dcm',
        'wadouri:/dicom3/1-540.dcm',
        'wadouri:/dicom3/1-541.dcm',
        'wadouri:/dicom3/1-542.dcm',
        'wadouri:/dicom3/1-543.dcm',
        'wadouri:/dicom3/1-544.dcm',
        'wadouri:/dicom3/1-545.dcm',
        'wadouri:/dicom3/1-546.dcm',
        'wadouri:/dicom3/1-547.dcm',
        'wadouri:/dicom3/1-548.dcm',
        'wadouri:/dicom3/1-549.dcm',
        'wadouri:/dicom3/1-550.dcm',
        'wadouri:/dicom3/1-551.dcm',
        'wadouri:/dicom3/1-552.dcm',
        'wadouri:/dicom3/1-553.dcm',
        'wadouri:/dicom3/1-554.dcm',
        'wadouri:/dicom3/1-555.dcm',
        'wadouri:/dicom3/1-556.dcm',
        'wadouri:/dicom3/1-557.dcm',
        'wadouri:/dicom3/1-558.dcm',
        'wadouri:/dicom3/1-559.dcm',
        'wadouri:/dicom3/1-560.dcm',
        'wadouri:/dicom3/1-561.dcm',
        'wadouri:/dicom3/1-562.dcm',
        'wadouri:/dicom3/1-563.dcm',
        'wadouri:/dicom3/1-564.dcm',
        'wadouri:/dicom3/1-565.dcm',
        'wadouri:/dicom3/1-566.dcm',
        'wadouri:/dicom3/1-567.dcm',
        'wadouri:/dicom3/1-568.dcm',
        'wadouri:/dicom3/1-569.dcm',
        'wadouri:/dicom3/1-570.dcm',
        'wadouri:/dicom3/1-571.dcm',
        'wadouri:/dicom3/1-572.dcm',
        'wadouri:/dicom3/1-573.dcm',
        'wadouri:/dicom3/1-574.dcm',
        'wadouri:/dicom3/1-575.dcm',
        'wadouri:/dicom3/1-576.dcm',
        'wadouri:/dicom3/1-577.dcm',
        'wadouri:/dicom3/1-578.dcm',
        'wadouri:/dicom3/1-579.dcm',
        'wadouri:/dicom3/1-580.dcm',
        'wadouri:/dicom3/1-581.dcm',
        'wadouri:/dicom3/1-582.dcm',
        'wadouri:/dicom3/1-583.dcm',
        'wadouri:/dicom3/1-584.dcm',
        'wadouri:/dicom3/1-585.dcm',
        'wadouri:/dicom3/1-586.dcm',
        'wadouri:/dicom3/1-587.dcm',
        'wadouri:/dicom3/1-588.dcm',
        'wadouri:/dicom3/1-589.dcm',
        'wadouri:/dicom3/1-590.dcm',
        'wadouri:/dicom3/1-591.dcm',
        'wadouri:/dicom3/1-592.dcm',
        'wadouri:/dicom3/1-593.dcm',
        'wadouri:/dicom3/1-594.dcm',
        'wadouri:/dicom3/1-595.dcm',
        'wadouri:/dicom3/1-596.dcm',
        'wadouri:/dicom3/1-597.dcm',
        'wadouri:/dicom3/1-598.dcm',
        'wadouri:/dicom3/1-599.dcm',
        'wadouri:/dicom3/1-600.dcm',
        'wadouri:/dicom3/1-601.dcm',
        'wadouri:/dicom3/1-602.dcm',
        'wadouri:/dicom3/1-603.dcm',
        'wadouri:/dicom3/1-604.dcm',
        'wadouri:/dicom3/1-605.dcm',
        'wadouri:/dicom3/1-606.dcm',
        'wadouri:/dicom3/1-607.dcm',
        'wadouri:/dicom3/1-608.dcm',
        'wadouri:/dicom3/1-609.dcm',
        'wadouri:/dicom3/1-610.dcm',
        'wadouri:/dicom3/1-611.dcm',
        'wadouri:/dicom3/1-612.dcm',
        'wadouri:/dicom3/1-613.dcm',
        'wadouri:/dicom3/1-614.dcm',
        'wadouri:/dicom3/1-615.dcm',
        'wadouri:/dicom3/1-616.dcm',
        'wadouri:/dicom3/1-617.dcm',
        'wadouri:/dicom3/1-618.dcm',
        'wadouri:/dicom3/1-619.dcm',
        'wadouri:/dicom3/1-620.dcm',
        'wadouri:/dicom3/1-621.dcm',
        'wadouri:/dicom3/1-622.dcm',
        'wadouri:/dicom3/1-623.dcm',
        'wadouri:/dicom3/1-624.dcm',
        'wadouri:/dicom3/1-625.dcm',
        'wadouri:/dicom3/1-626.dcm',
        'wadouri:/dicom3/1-627.dcm',
        'wadouri:/dicom3/1-628.dcm',
        'wadouri:/dicom3/1-629.dcm',
        'wadouri:/dicom3/1-630.dcm',
        'wadouri:/dicom3/1-631.dcm',
        'wadouri:/dicom3/1-632.dcm',
        'wadouri:/dicom3/1-633.dcm',
        'wadouri:/dicom3/1-634.dcm',
        'wadouri:/dicom3/1-635.dcm',
        'wadouri:/dicom3/1-636.dcm',
        'wadouri:/dicom3/1-637.dcm',
        'wadouri:/dicom3/1-638.dcm',
        'wadouri:/dicom3/1-639.dcm',
        'wadouri:/dicom3/1-640.dcm',
        'wadouri:/dicom3/1-641.dcm',
        'wadouri:/dicom3/1-642.dcm',
        'wadouri:/dicom3/1-643.dcm',
        'wadouri:/dicom3/1-644.dcm',
        'wadouri:/dicom3/1-645.dcm',
        'wadouri:/dicom3/1-646.dcm',
        'wadouri:/dicom3/1-647.dcm',
        'wadouri:/dicom3/1-648.dcm',
        'wadouri:/dicom3/1-649.dcm',
        'wadouri:/dicom3/1-650.dcm',
        'wadouri:/dicom3/1-651.dcm',
        'wadouri:/dicom3/1-652.dcm',
        'wadouri:/dicom3/1-653.dcm',
        'wadouri:/dicom3/1-654.dcm',
        'wadouri:/dicom3/1-655.dcm',
        'wadouri:/dicom3/1-656.dcm',
        'wadouri:/dicom3/1-657.dcm',
        'wadouri:/dicom3/1-658.dcm',
        'wadouri:/dicom3/1-659.dcm',
        'wadouri:/dicom3/1-660.dcm',
        'wadouri:/dicom3/1-661.dcm',
        'wadouri:/dicom3/1-662.dcm',
        'wadouri:/dicom3/1-663.dcm',
        'wadouri:/dicom3/1-664.dcm',
        'wadouri:/dicom3/1-665.dcm',
        'wadouri:/dicom3/1-666.dcm',
        'wadouri:/dicom3/1-667.dcm',
        'wadouri:/dicom3/1-668.dcm',
        'wadouri:/dicom3/1-669.dcm',
        'wadouri:/dicom3/1-670.dcm',
        'wadouri:/dicom3/1-671.dcm',
        'wadouri:/dicom3/1-672.dcm',
        'wadouri:/dicom3/1-673.dcm',
        'wadouri:/dicom3/1-674.dcm',
        'wadouri:/dicom3/1-675.dcm',
        'wadouri:/dicom3/1-676.dcm',
        'wadouri:/dicom3/1-677.dcm',
        'wadouri:/dicom3/1-678.dcm',
        'wadouri:/dicom3/1-679.dcm',
        'wadouri:/dicom3/1-680.dcm',
        'wadouri:/dicom3/1-681.dcm',
        'wadouri:/dicom3/1-682.dcm',
        'wadouri:/dicom3/1-683.dcm',
        'wadouri:/dicom3/1-684.dcm',
        'wadouri:/dicom3/1-685.dcm',
        'wadouri:/dicom3/1-686.dcm',
        'wadouri:/dicom3/1-687.dcm',
        'wadouri:/dicom3/1-688.dcm',
        'wadouri:/dicom3/1-689.dcm',
        'wadouri:/dicom3/1-690.dcm',
        'wadouri:/dicom3/1-691.dcm',
        'wadouri:/dicom3/1-692.dcm',
        'wadouri:/dicom3/1-693.dcm',
        'wadouri:/dicom3/1-694.dcm',
        'wadouri:/dicom3/1-695.dcm',
        'wadouri:/dicom3/1-696.dcm',
        'wadouri:/dicom3/1-697.dcm',
        'wadouri:/dicom3/1-698.dcm',
        'wadouri:/dicom3/1-699.dcm',
        'wadouri:/dicom3/1-700.dcm',
        'wadouri:/dicom3/1-701.dcm',
        'wadouri:/dicom3/1-702.dcm',
        'wadouri:/dicom3/1-703.dcm',
        'wadouri:/dicom3/1-704.dcm',
        'wadouri:/dicom3/1-705.dcm',
        'wadouri:/dicom3/1-706.dcm',
        'wadouri:/dicom3/1-707.dcm',
        'wadouri:/dicom3/1-708.dcm',
        'wadouri:/dicom3/1-709.dcm',
        'wadouri:/dicom3/1-710.dcm',
        'wadouri:/dicom3/1-711.dcm',
        'wadouri:/dicom3/1-712.dcm',
        'wadouri:/dicom3/1-713.dcm',
        'wadouri:/dicom3/1-714.dcm',
        'wadouri:/dicom3/1-715.dcm',
        'wadouri:/dicom3/1-716.dcm',
        'wadouri:/dicom3/1-717.dcm',
        'wadouri:/dicom3/1-718.dcm',
        'wadouri:/dicom3/1-719.dcm',
        'wadouri:/dicom3/1-720.dcm',
        'wadouri:/dicom3/1-721.dcm',
        'wadouri:/dicom3/1-722.dcm',
        'wadouri:/dicom3/1-723.dcm',
        'wadouri:/dicom3/1-724.dcm',
        'wadouri:/dicom3/1-725.dcm',
        'wadouri:/dicom3/1-726.dcm',
        'wadouri:/dicom3/1-727.dcm',
        'wadouri:/dicom3/1-728.dcm',
        'wadouri:/dicom3/1-729.dcm',
        'wadouri:/dicom3/1-730.dcm',
        'wadouri:/dicom3/1-731.dcm',
        'wadouri:/dicom3/1-732.dcm',
        'wadouri:/dicom3/1-733.dcm',
        'wadouri:/dicom3/1-734.dcm',
        'wadouri:/dicom3/1-735.dcm',
        'wadouri:/dicom3/1-736.dcm',
        'wadouri:/dicom3/1-737.dcm',
        'wadouri:/dicom3/1-738.dcm',
        'wadouri:/dicom3/1-739.dcm',
        'wadouri:/dicom3/1-740.dcm',
        'wadouri:/dicom3/1-741.dcm',
        'wadouri:/dicom3/1-742.dcm',
        'wadouri:/dicom3/1-743.dcm',
        'wadouri:/dicom3/1-744.dcm',
        'wadouri:/dicom3/1-745.dcm',
        'wadouri:/dicom3/1-746.dcm',
        'wadouri:/dicom3/1-747.dcm',
        'wadouri:/dicom3/1-748.dcm',
        'wadouri:/dicom3/1-749.dcm',
        'wadouri:/dicom3/1-750.dcm',
        'wadouri:/dicom3/1-751.dcm',
        'wadouri:/dicom3/1-752.dcm',
        'wadouri:/dicom3/1-753.dcm',
        'wadouri:/dicom3/1-754.dcm',
        'wadouri:/dicom3/1-755.dcm',
        'wadouri:/dicom3/1-756.dcm',
        'wadouri:/dicom3/1-757.dcm',
        'wadouri:/dicom3/1-758.dcm',
        'wadouri:/dicom3/1-759.dcm',
        'wadouri:/dicom3/1-760.dcm',
        'wadouri:/dicom3/1-761.dcm',
        'wadouri:/dicom3/1-762.dcm',
        'wadouri:/dicom3/1-763.dcm',
        'wadouri:/dicom3/1-764.dcm',
        'wadouri:/dicom3/1-765.dcm',
        'wadouri:/dicom3/1-766.dcm',
        'wadouri:/dicom3/1-767.dcm',
        'wadouri:/dicom3/1-768.dcm',
        'wadouri:/dicom3/1-769.dcm',
        'wadouri:/dicom3/1-770.dcm',
        'wadouri:/dicom3/1-771.dcm',
        'wadouri:/dicom3/1-772.dcm',
        'wadouri:/dicom3/1-773.dcm',
        'wadouri:/dicom3/1-774.dcm',
        'wadouri:/dicom3/1-775.dcm',
        'wadouri:/dicom3/1-776.dcm',
        'wadouri:/dicom3/1-777.dcm',
        'wadouri:/dicom3/1-778.dcm',
        'wadouri:/dicom3/1-779.dcm',
        'wadouri:/dicom3/1-780.dcm',
        'wadouri:/dicom3/1-781.dcm',
        'wadouri:/dicom3/1-782.dcm',
        'wadouri:/dicom3/1-783.dcm',
        'wadouri:/dicom3/1-784.dcm',
        'wadouri:/dicom3/1-785.dcm',
        'wadouri:/dicom3/1-786.dcm',
        'wadouri:/dicom3/1-787.dcm',
        'wadouri:/dicom3/1-788.dcm',
        'wadouri:/dicom3/1-789.dcm',
        'wadouri:/dicom3/1-790.dcm',
        'wadouri:/dicom3/1-791.dcm',
        'wadouri:/dicom3/1-792.dcm',
        'wadouri:/dicom3/1-793.dcm',
        'wadouri:/dicom3/1-794.dcm',
        'wadouri:/dicom3/1-795.dcm',
        'wadouri:/dicom3/1-796.dcm',
        'wadouri:/dicom3/1-797.dcm',
        'wadouri:/dicom3/1-798.dcm',
        'wadouri:/dicom3/1-799.dcm',
        'wadouri:/dicom3/1-800.dcm',
        'wadouri:/dicom3/1-801.dcm',
        'wadouri:/dicom3/1-802.dcm',
        'wadouri:/dicom3/1-803.dcm',
        'wadouri:/dicom3/1-804.dcm',
        'wadouri:/dicom3/1-805.dcm',
        'wadouri:/dicom3/1-806.dcm',
        'wadouri:/dicom3/1-807.dcm',
        'wadouri:/dicom3/1-808.dcm',
        'wadouri:/dicom3/1-809.dcm',
        'wadouri:/dicom3/1-810.dcm',
        'wadouri:/dicom3/1-811.dcm',
        'wadouri:/dicom3/1-812.dcm',
        'wadouri:/dicom3/1-813.dcm',
        'wadouri:/dicom3/1-814.dcm',
        'wadouri:/dicom3/1-815.dcm',
        'wadouri:/dicom3/1-816.dcm',
        'wadouri:/dicom3/1-817.dcm',
        'wadouri:/dicom3/1-818.dcm',
        'wadouri:/dicom3/1-819.dcm',
        'wadouri:/dicom3/1-820.dcm',
        'wadouri:/dicom3/1-821.dcm',
        'wadouri:/dicom3/1-822.dcm',
        'wadouri:/dicom3/1-823.dcm',
        'wadouri:/dicom3/1-824.dcm',
        'wadouri:/dicom3/1-825.dcm',
        'wadouri:/dicom3/1-826.dcm',
        'wadouri:/dicom3/1-827.dcm',
        'wadouri:/dicom3/1-828.dcm',
        'wadouri:/dicom3/1-829.dcm',
        'wadouri:/dicom3/1-830.dcm',
        'wadouri:/dicom3/1-831.dcm',
        'wadouri:/dicom3/1-832.dcm',
        'wadouri:/dicom3/1-833.dcm',
        'wadouri:/dicom3/1-834.dcm',
        'wadouri:/dicom3/1-835.dcm',
        'wadouri:/dicom3/1-836.dcm',
        'wadouri:/dicom3/1-837.dcm',
        'wadouri:/dicom3/1-838.dcm',
        'wadouri:/dicom3/1-839.dcm',
        'wadouri:/dicom3/1-840.dcm',
        'wadouri:/dicom3/1-841.dcm',
        'wadouri:/dicom3/1-842.dcm',
        'wadouri:/dicom3/1-843.dcm',
        'wadouri:/dicom3/1-844.dcm',
        'wadouri:/dicom3/1-845.dcm',
        'wadouri:/dicom3/1-846.dcm',
        'wadouri:/dicom3/1-847.dcm',
        'wadouri:/dicom3/1-848.dcm',
        'wadouri:/dicom3/1-849.dcm',
        'wadouri:/dicom3/1-850.dcm',
        'wadouri:/dicom3/1-851.dcm',
        'wadouri:/dicom3/1-852.dcm',
        'wadouri:/dicom3/1-853.dcm',
        'wadouri:/dicom3/1-854.dcm',
        'wadouri:/dicom3/1-855.dcm',
        'wadouri:/dicom3/1-856.dcm',
        'wadouri:/dicom3/1-857.dcm',
        'wadouri:/dicom3/1-858.dcm',
        'wadouri:/dicom3/1-859.dcm',
        'wadouri:/dicom3/1-860.dcm',
        'wadouri:/dicom3/1-861.dcm',
        'wadouri:/dicom3/1-862.dcm',
        'wadouri:/dicom3/1-863.dcm',
        'wadouri:/dicom3/1-864.dcm',
        'wadouri:/dicom3/1-865.dcm',
        'wadouri:/dicom3/1-866.dcm',
        'wadouri:/dicom3/1-867.dcm',
        'wadouri:/dicom3/1-868.dcm',
        'wadouri:/dicom3/1-869.dcm',
        'wadouri:/dicom3/1-870.dcm',
        'wadouri:/dicom3/1-871.dcm',
        'wadouri:/dicom3/1-872.dcm',
        'wadouri:/dicom3/1-873.dcm',
        'wadouri:/dicom3/1-874.dcm',
        'wadouri:/dicom3/1-875.dcm',
        'wadouri:/dicom3/1-876.dcm',
        'wadouri:/dicom3/1-877.dcm',
        'wadouri:/dicom3/1-878.dcm',
        'wadouri:/dicom3/1-879.dcm',
        'wadouri:/dicom3/1-880.dcm',
        'wadouri:/dicom3/1-881.dcm',
        'wadouri:/dicom3/1-882.dcm',
        'wadouri:/dicom3/1-883.dcm',
        'wadouri:/dicom3/1-884.dcm',
        'wadouri:/dicom3/1-885.dcm',
        'wadouri:/dicom3/1-886.dcm',
        'wadouri:/dicom3/1-887.dcm',
        'wadouri:/dicom3/1-888.dcm',
        'wadouri:/dicom3/1-889.dcm',
        'wadouri:/dicom3/1-890.dcm',
        'wadouri:/dicom3/1-891.dcm',
        'wadouri:/dicom3/1-892.dcm',
        'wadouri:/dicom3/1-893.dcm',
        'wadouri:/dicom3/1-894.dcm',
        'wadouri:/dicom3/1-895.dcm',
        'wadouri:/dicom3/1-896.dcm',
        'wadouri:/dicom3/1-897.dcm',
        'wadouri:/dicom3/1-898.dcm',
        'wadouri:/dicom3/1-899.dcm',
        'wadouri:/dicom3/1-900.dcm',
        'wadouri:/dicom3/1-901.dcm',
        'wadouri:/dicom3/1-902.dcm',
        'wadouri:/dicom3/1-903.dcm',
        'wadouri:/dicom3/1-904.dcm',
        'wadouri:/dicom3/1-905.dcm',
        'wadouri:/dicom3/1-906.dcm',
        'wadouri:/dicom3/1-907.dcm',
        'wadouri:/dicom3/1-908.dcm',
        'wadouri:/dicom3/1-909.dcm',
        'wadouri:/dicom3/1-910.dcm',
        'wadouri:/dicom3/1-911.dcm',
        'wadouri:/dicom3/1-912.dcm',
        'wadouri:/dicom3/1-913.dcm',
        'wadouri:/dicom3/1-914.dcm',
        'wadouri:/dicom3/1-915.dcm',
        'wadouri:/dicom3/1-916.dcm',
        'wadouri:/dicom3/1-917.dcm',
        'wadouri:/dicom3/1-918.dcm',
        'wadouri:/dicom3/1-919.dcm',
        'wadouri:/dicom3/1-920.dcm',
        'wadouri:/dicom3/1-921.dcm',
        'wadouri:/dicom3/1-922.dcm',
        'wadouri:/dicom3/1-923.dcm',
        'wadouri:/dicom3/1-924.dcm',
        'wadouri:/dicom3/1-925.dcm',
        'wadouri:/dicom3/1-926.dcm',
        'wadouri:/dicom3/1-927.dcm',
        'wadouri:/dicom3/1-928.dcm',
        'wadouri:/dicom3/1-929.dcm',
        'wadouri:/dicom3/1-930.dcm',
        'wadouri:/dicom3/1-931.dcm',
        'wadouri:/dicom3/1-932.dcm',
        'wadouri:/dicom3/1-933.dcm',
        'wadouri:/dicom3/1-934.dcm',
        'wadouri:/dicom3/1-935.dcm',
        'wadouri:/dicom3/1-936.dcm',
        'wadouri:/dicom3/1-937.dcm',
        'wadouri:/dicom3/1-938.dcm',
        'wadouri:/dicom3/1-939.dcm',
        'wadouri:/dicom3/1-940.dcm',
        'wadouri:/dicom3/1-941.dcm',
        'wadouri:/dicom3/1-942.dcm',
        'wadouri:/dicom3/1-943.dcm',
        'wadouri:/dicom3/1-944.dcm',
        'wadouri:/dicom3/1-945.dcm',
        'wadouri:/dicom3/1-946.dcm',
        'wadouri:/dicom3/1-947.dcm',
        'wadouri:/dicom3/1-948.dcm',
        'wadouri:/dicom3/1-949.dcm',
        'wadouri:/dicom3/1-950.dcm',
        'wadouri:/dicom3/1-951.dcm',
        'wadouri:/dicom3/1-952.dcm',
        'wadouri:/dicom3/1-953.dcm',
        'wadouri:/dicom3/1-954.dcm',
        'wadouri:/dicom3/1-955.dcm',
        'wadouri:/dicom3/1-956.dcm',
        'wadouri:/dicom3/1-957.dcm',
        'wadouri:/dicom3/1-958.dcm',
        'wadouri:/dicom3/1-959.dcm',
        'wadouri:/dicom3/1-960.dcm',
        'wadouri:/dicom3/1-961.dcm',
        'wadouri:/dicom3/1-962.dcm',
        'wadouri:/dicom3/1-963.dcm',
        'wadouri:/dicom3/1-964.dcm',
        'wadouri:/dicom3/1-965.dcm',
        'wadouri:/dicom3/1-966.dcm',
        'wadouri:/dicom3/1-967.dcm',
        'wadouri:/dicom3/1-968.dcm',
        'wadouri:/dicom3/1-969.dcm',
        'wadouri:/dicom3/1-970.dcm',
        'wadouri:/dicom3/1-971.dcm',
        'wadouri:/dicom3/1-972.dcm',
        'wadouri:/dicom3/1-973.dcm',
        'wadouri:/dicom3/1-974.dcm',
        'wadouri:/dicom3/1-975.dcm',
    ];
}//}}}
function getTestImageIds2() {//{{{
    return [
        'wadouri:/dicom2/01-001.dcm',
        'wadouri:/dicom2/01-002.dcm',
        'wadouri:/dicom2/01-003.dcm',
        'wadouri:/dicom2/01-004.dcm',
        'wadouri:/dicom2/01-005.dcm',
        'wadouri:/dicom2/01-006.dcm',
        'wadouri:/dicom2/01-007.dcm',
        'wadouri:/dicom2/01-008.dcm',
        'wadouri:/dicom2/01-009.dcm',
        'wadouri:/dicom2/01-010.dcm',
        'wadouri:/dicom2/01-011.dcm',
        'wadouri:/dicom2/01-012.dcm',
        'wadouri:/dicom2/01-013.dcm',
        'wadouri:/dicom2/01-014.dcm',
        'wadouri:/dicom2/01-015.dcm',
        'wadouri:/dicom2/01-016.dcm',
        'wadouri:/dicom2/01-017.dcm',
        'wadouri:/dicom2/01-018.dcm',
        'wadouri:/dicom2/01-019.dcm',
        'wadouri:/dicom2/01-020.dcm',
        'wadouri:/dicom2/01-021.dcm',
        'wadouri:/dicom2/01-022.dcm',
        'wadouri:/dicom2/01-023.dcm',
        'wadouri:/dicom2/01-024.dcm',
        'wadouri:/dicom2/01-025.dcm',
        'wadouri:/dicom2/01-026.dcm',
        'wadouri:/dicom2/01-027.dcm',
        'wadouri:/dicom2/01-028.dcm',
        'wadouri:/dicom2/01-029.dcm',
        'wadouri:/dicom2/02-001.dcm',
        'wadouri:/dicom2/02-002.dcm',
        'wadouri:/dicom2/02-003.dcm',
        'wadouri:/dicom2/02-004.dcm',
        'wadouri:/dicom2/02-005.dcm',
        'wadouri:/dicom2/02-006.dcm',
        'wadouri:/dicom2/02-007.dcm',
        'wadouri:/dicom2/02-008.dcm',
        'wadouri:/dicom2/02-009.dcm',
        'wadouri:/dicom2/02-010.dcm',
        'wadouri:/dicom2/02-011.dcm',
        'wadouri:/dicom2/02-012.dcm',
        'wadouri:/dicom2/02-013.dcm',
        'wadouri:/dicom2/02-014.dcm',
        'wadouri:/dicom2/02-015.dcm',
        'wadouri:/dicom2/02-016.dcm',
        'wadouri:/dicom2/02-017.dcm',
        'wadouri:/dicom2/02-018.dcm',
        'wadouri:/dicom2/02-019.dcm',
        'wadouri:/dicom2/02-020.dcm',
        'wadouri:/dicom2/02-021.dcm',
        'wadouri:/dicom2/02-022.dcm',
        'wadouri:/dicom2/02-023.dcm',
        'wadouri:/dicom2/02-024.dcm',
        'wadouri:/dicom2/02-025.dcm',
        'wadouri:/dicom2/02-026.dcm',
        'wadouri:/dicom2/02-027.dcm',
        'wadouri:/dicom2/02-028.dcm',
        'wadouri:/dicom2/02-029.dcm',
        'wadouri:/dicom2/02-030.dcm',
        'wadouri:/dicom2/03-001.dcm',
        'wadouri:/dicom2/03-002.dcm',
        'wadouri:/dicom2/03-003.dcm',
        'wadouri:/dicom2/03-004.dcm',
        'wadouri:/dicom2/03-005.dcm',
        'wadouri:/dicom2/03-006.dcm',
        'wadouri:/dicom2/03-007.dcm',
        'wadouri:/dicom2/03-008.dcm',
        'wadouri:/dicom2/03-009.dcm',
        'wadouri:/dicom2/03-010.dcm',
        'wadouri:/dicom2/03-011.dcm',
        'wadouri:/dicom2/03-012.dcm',
        'wadouri:/dicom2/03-013.dcm',
        'wadouri:/dicom2/03-014.dcm',
        'wadouri:/dicom2/03-015.dcm',
        'wadouri:/dicom2/03-016.dcm',
        'wadouri:/dicom2/03-017.dcm',
        'wadouri:/dicom2/03-018.dcm',
        'wadouri:/dicom2/03-019.dcm',
        'wadouri:/dicom2/03-020.dcm',
        'wadouri:/dicom2/03-021.dcm',
        'wadouri:/dicom2/03-022.dcm',
        'wadouri:/dicom2/03-023.dcm',
        'wadouri:/dicom2/03-024.dcm',
        'wadouri:/dicom2/03-025.dcm',
        'wadouri:/dicom2/03-026.dcm',
        'wadouri:/dicom2/03-027.dcm',
        'wadouri:/dicom2/03-028.dcm',
        'wadouri:/dicom2/03-029.dcm',
        'wadouri:/dicom2/04-001.dcm',
        'wadouri:/dicom2/04-002.dcm',
        'wadouri:/dicom2/04-003.dcm',
        'wadouri:/dicom2/04-004.dcm',
        'wadouri:/dicom2/04-005.dcm',
        'wadouri:/dicom2/04-006.dcm',
        'wadouri:/dicom2/04-007.dcm',
        'wadouri:/dicom2/04-008.dcm',
        'wadouri:/dicom2/04-009.dcm',
        'wadouri:/dicom2/04-010.dcm',
        'wadouri:/dicom2/04-011.dcm',
        'wadouri:/dicom2/04-012.dcm',
        'wadouri:/dicom2/04-013.dcm',
        'wadouri:/dicom2/04-014.dcm',
        'wadouri:/dicom2/04-015.dcm',
        'wadouri:/dicom2/04-016.dcm',
        'wadouri:/dicom2/04-017.dcm',
        'wadouri:/dicom2/04-018.dcm',
        'wadouri:/dicom2/04-019.dcm',
        'wadouri:/dicom2/04-020.dcm',
        'wadouri:/dicom2/04-021.dcm',
        'wadouri:/dicom2/04-022.dcm',
        'wadouri:/dicom2/04-023.dcm',
        'wadouri:/dicom2/04-024.dcm',
        'wadouri:/dicom2/04-025.dcm',
        'wadouri:/dicom2/04-026.dcm',
        'wadouri:/dicom2/04-027.dcm',
        'wadouri:/dicom2/04-028.dcm',
        'wadouri:/dicom2/04-029.dcm',
        'wadouri:/dicom2/04-030.dcm',
        'wadouri:/dicom2/05-001.dcm',
        'wadouri:/dicom2/05-002.dcm',
        'wadouri:/dicom2/05-003.dcm',
        'wadouri:/dicom2/05-004.dcm',
        'wadouri:/dicom2/05-005.dcm',
        'wadouri:/dicom2/05-006.dcm',
        'wadouri:/dicom2/05-007.dcm',
        'wadouri:/dicom2/05-008.dcm',
        'wadouri:/dicom2/05-009.dcm',
        'wadouri:/dicom2/05-010.dcm',
        'wadouri:/dicom2/05-011.dcm',
        'wadouri:/dicom2/05-012.dcm',
        'wadouri:/dicom2/05-013.dcm',
        'wadouri:/dicom2/05-014.dcm',
        'wadouri:/dicom2/05-015.dcm',
        'wadouri:/dicom2/05-016.dcm',
        'wadouri:/dicom2/05-017.dcm',
        'wadouri:/dicom2/05-018.dcm',
        'wadouri:/dicom2/05-019.dcm',
        'wadouri:/dicom2/05-020.dcm',
        'wadouri:/dicom2/05-021.dcm',
        'wadouri:/dicom2/05-022.dcm',
        'wadouri:/dicom2/05-023.dcm',
        'wadouri:/dicom2/05-024.dcm',
        'wadouri:/dicom2/05-025.dcm',
        'wadouri:/dicom2/05-026.dcm',
        'wadouri:/dicom2/05-027.dcm',
        'wadouri:/dicom2/05-028.dcm',
        'wadouri:/dicom2/05-029.dcm',
        'wadouri:/dicom2/05-030.dcm',
        'wadouri:/dicom2/06-001.dcm',
        'wadouri:/dicom2/06-002.dcm',
        'wadouri:/dicom2/06-003.dcm',
        'wadouri:/dicom2/06-004.dcm',
        'wadouri:/dicom2/06-005.dcm',
        'wadouri:/dicom2/06-006.dcm',
        'wadouri:/dicom2/06-007.dcm',
        'wadouri:/dicom2/06-008.dcm',
        'wadouri:/dicom2/06-009.dcm',
        'wadouri:/dicom2/06-010.dcm',
        'wadouri:/dicom2/06-011.dcm',
        'wadouri:/dicom2/06-012.dcm',
        'wadouri:/dicom2/06-013.dcm',
        'wadouri:/dicom2/06-014.dcm',
        'wadouri:/dicom2/06-015.dcm',
        'wadouri:/dicom2/06-016.dcm',
        'wadouri:/dicom2/06-017.dcm',
        'wadouri:/dicom2/06-018.dcm',
        'wadouri:/dicom2/06-019.dcm',
        'wadouri:/dicom2/06-020.dcm',
        'wadouri:/dicom2/06-021.dcm',
        'wadouri:/dicom2/06-022.dcm',
        'wadouri:/dicom2/06-023.dcm',
        'wadouri:/dicom2/06-024.dcm',
        'wadouri:/dicom2/06-025.dcm',
        'wadouri:/dicom2/06-026.dcm',
        'wadouri:/dicom2/06-027.dcm',
        'wadouri:/dicom2/06-028.dcm',
        'wadouri:/dicom2/06-029.dcm',
        'wadouri:/dicom2/06-030.dcm',
        'wadouri:/dicom2/07-001.dcm',
        'wadouri:/dicom2/07-002.dcm',
        'wadouri:/dicom2/07-003.dcm',
        'wadouri:/dicom2/07-004.dcm',
        'wadouri:/dicom2/07-005.dcm',
        'wadouri:/dicom2/07-006.dcm',
        'wadouri:/dicom2/07-007.dcm',
        'wadouri:/dicom2/07-008.dcm',
        'wadouri:/dicom2/07-009.dcm',
        'wadouri:/dicom2/07-010.dcm',
        'wadouri:/dicom2/07-011.dcm',
        'wadouri:/dicom2/07-012.dcm',
        'wadouri:/dicom2/07-013.dcm',
        'wadouri:/dicom2/07-014.dcm',
        'wadouri:/dicom2/07-015.dcm',
        'wadouri:/dicom2/07-016.dcm',
        'wadouri:/dicom2/07-017.dcm',
        'wadouri:/dicom2/07-018.dcm',
        'wadouri:/dicom2/07-019.dcm',
        'wadouri:/dicom2/07-020.dcm',
        'wadouri:/dicom2/07-021.dcm',
        'wadouri:/dicom2/07-022.dcm',
        'wadouri:/dicom2/07-023.dcm',
        'wadouri:/dicom2/07-024.dcm',
        'wadouri:/dicom2/07-025.dcm',
        'wadouri:/dicom2/07-026.dcm',
        'wadouri:/dicom2/07-027.dcm',
        'wadouri:/dicom2/07-028.dcm',
        'wadouri:/dicom2/07-029.dcm',
        'wadouri:/dicom2/08-001.dcm',
        'wadouri:/dicom2/08-002.dcm',
        'wadouri:/dicom2/08-003.dcm',
        'wadouri:/dicom2/08-004.dcm',
        'wadouri:/dicom2/08-005.dcm',
        'wadouri:/dicom2/08-006.dcm',
        'wadouri:/dicom2/08-007.dcm',
        'wadouri:/dicom2/08-008.dcm',
        'wadouri:/dicom2/08-009.dcm',
        'wadouri:/dicom2/08-010.dcm',
        'wadouri:/dicom2/08-011.dcm',
        'wadouri:/dicom2/08-012.dcm',
        'wadouri:/dicom2/08-013.dcm',
        'wadouri:/dicom2/08-014.dcm',
        'wadouri:/dicom2/08-015.dcm',
        'wadouri:/dicom2/08-016.dcm',
        'wadouri:/dicom2/08-017.dcm',
        'wadouri:/dicom2/08-018.dcm',
        'wadouri:/dicom2/08-019.dcm',
        'wadouri:/dicom2/08-020.dcm',
        'wadouri:/dicom2/08-021.dcm',
        'wadouri:/dicom2/08-022.dcm',
        'wadouri:/dicom2/08-023.dcm',
        'wadouri:/dicom2/08-024.dcm',
        'wadouri:/dicom2/08-025.dcm',
        'wadouri:/dicom2/08-026.dcm',
        'wadouri:/dicom2/08-027.dcm',
        'wadouri:/dicom2/08-028.dcm',
        'wadouri:/dicom2/08-029.dcm',
        'wadouri:/dicom2/08-030.dcm',
        'wadouri:/dicom2/09-001.dcm',
        'wadouri:/dicom2/09-002.dcm',
        'wadouri:/dicom2/09-003.dcm',
        'wadouri:/dicom2/09-004.dcm',
        'wadouri:/dicom2/09-005.dcm',
        'wadouri:/dicom2/09-006.dcm',
        'wadouri:/dicom2/09-007.dcm',
        'wadouri:/dicom2/09-008.dcm',
        'wadouri:/dicom2/09-009.dcm',
        'wadouri:/dicom2/09-010.dcm',
        'wadouri:/dicom2/09-011.dcm',
        'wadouri:/dicom2/09-012.dcm',
        'wadouri:/dicom2/09-013.dcm',
        'wadouri:/dicom2/09-014.dcm',
        'wadouri:/dicom2/09-015.dcm',
        'wadouri:/dicom2/09-016.dcm',
        'wadouri:/dicom2/09-017.dcm',
        'wadouri:/dicom2/09-018.dcm',
        'wadouri:/dicom2/09-019.dcm',
        'wadouri:/dicom2/09-020.dcm',
        'wadouri:/dicom2/09-021.dcm',
        'wadouri:/dicom2/09-022.dcm',
        'wadouri:/dicom2/09-023.dcm',
        'wadouri:/dicom2/09-024.dcm',
        'wadouri:/dicom2/09-025.dcm',
        'wadouri:/dicom2/09-026.dcm',
        'wadouri:/dicom2/09-027.dcm',
        'wadouri:/dicom2/09-028.dcm',
        'wadouri:/dicom2/09-029.dcm',
        'wadouri:/dicom2/09-030.dcm',
        'wadouri:/dicom2/10-001.dcm',
        'wadouri:/dicom2/10-002.dcm',
        'wadouri:/dicom2/10-003.dcm',
        'wadouri:/dicom2/10-004.dcm',
        'wadouri:/dicom2/10-005.dcm',
        'wadouri:/dicom2/10-006.dcm',
        'wadouri:/dicom2/10-007.dcm',
        'wadouri:/dicom2/10-008.dcm',
        'wadouri:/dicom2/10-009.dcm',
        'wadouri:/dicom2/10-010.dcm',
        'wadouri:/dicom2/10-011.dcm',
        'wadouri:/dicom2/10-012.dcm',
        'wadouri:/dicom2/10-013.dcm',
        'wadouri:/dicom2/10-014.dcm',
        'wadouri:/dicom2/10-015.dcm',
        'wadouri:/dicom2/10-016.dcm',
        'wadouri:/dicom2/10-017.dcm',
        'wadouri:/dicom2/10-018.dcm',
        'wadouri:/dicom2/10-019.dcm',
        'wadouri:/dicom2/10-020.dcm',
        'wadouri:/dicom2/10-021.dcm',
        'wadouri:/dicom2/10-022.dcm',
        'wadouri:/dicom2/10-023.dcm',
        'wadouri:/dicom2/10-024.dcm',
        'wadouri:/dicom2/10-025.dcm',
        'wadouri:/dicom2/10-026.dcm',
        'wadouri:/dicom2/10-027.dcm',
        'wadouri:/dicom2/10-028.dcm',
        'wadouri:/dicom2/10-029.dcm',
        'wadouri:/dicom2/11-001.dcm',
        'wadouri:/dicom2/11-002.dcm',
        'wadouri:/dicom2/11-003.dcm',
        'wadouri:/dicom2/11-004.dcm',
        'wadouri:/dicom2/11-005.dcm',
        'wadouri:/dicom2/11-006.dcm',
        'wadouri:/dicom2/11-007.dcm',
        'wadouri:/dicom2/11-008.dcm',
        'wadouri:/dicom2/11-009.dcm',
        'wadouri:/dicom2/11-010.dcm',
        'wadouri:/dicom2/11-011.dcm',
        'wadouri:/dicom2/11-012.dcm',
        'wadouri:/dicom2/11-013.dcm',
        'wadouri:/dicom2/11-014.dcm',
        'wadouri:/dicom2/11-015.dcm',
        'wadouri:/dicom2/11-016.dcm',
        'wadouri:/dicom2/11-017.dcm',
        'wadouri:/dicom2/11-018.dcm',
        'wadouri:/dicom2/11-019.dcm',
        'wadouri:/dicom2/11-020.dcm',
        'wadouri:/dicom2/11-021.dcm',
        'wadouri:/dicom2/11-022.dcm',
        'wadouri:/dicom2/11-023.dcm',
        'wadouri:/dicom2/11-024.dcm',
        'wadouri:/dicom2/11-025.dcm',
        'wadouri:/dicom2/11-026.dcm',
        'wadouri:/dicom2/11-027.dcm',
        'wadouri:/dicom2/11-028.dcm',
        'wadouri:/dicom2/11-029.dcm',
        'wadouri:/dicom2/11-030.dcm',
        'wadouri:/dicom2/12-001.dcm',
        'wadouri:/dicom2/12-002.dcm',
        'wadouri:/dicom2/12-003.dcm',
        'wadouri:/dicom2/12-004.dcm',
        'wadouri:/dicom2/12-005.dcm',
        'wadouri:/dicom2/12-006.dcm',
        'wadouri:/dicom2/12-007.dcm',
        'wadouri:/dicom2/12-008.dcm',
        'wadouri:/dicom2/12-009.dcm',
        'wadouri:/dicom2/12-010.dcm',
        'wadouri:/dicom2/12-011.dcm',
        'wadouri:/dicom2/12-012.dcm',
        'wadouri:/dicom2/12-013.dcm',
        'wadouri:/dicom2/12-014.dcm',
        'wadouri:/dicom2/12-015.dcm',
        'wadouri:/dicom2/12-016.dcm',
        'wadouri:/dicom2/12-017.dcm',
        'wadouri:/dicom2/12-018.dcm',
        'wadouri:/dicom2/12-019.dcm',
        'wadouri:/dicom2/12-020.dcm',
        'wadouri:/dicom2/12-021.dcm',
        'wadouri:/dicom2/12-022.dcm',
        'wadouri:/dicom2/12-023.dcm',
        'wadouri:/dicom2/12-024.dcm',
        'wadouri:/dicom2/12-025.dcm',
        'wadouri:/dicom2/12-026.dcm',
        'wadouri:/dicom2/12-027.dcm',
        'wadouri:/dicom2/12-028.dcm',
        'wadouri:/dicom2/12-029.dcm',
        'wadouri:/dicom2/12-030.dcm',
        'wadouri:/dicom2/13-001.dcm',
        'wadouri:/dicom2/13-002.dcm',
        'wadouri:/dicom2/13-003.dcm',
        'wadouri:/dicom2/13-004.dcm',
        'wadouri:/dicom2/13-005.dcm',
        'wadouri:/dicom2/13-006.dcm',
        'wadouri:/dicom2/13-007.dcm',
        'wadouri:/dicom2/13-008.dcm',
        'wadouri:/dicom2/13-009.dcm',
        'wadouri:/dicom2/13-010.dcm',
        'wadouri:/dicom2/13-011.dcm',
        'wadouri:/dicom2/13-012.dcm',
        'wadouri:/dicom2/13-013.dcm',
        'wadouri:/dicom2/13-014.dcm',
        'wadouri:/dicom2/13-015.dcm',
        'wadouri:/dicom2/13-016.dcm',
        'wadouri:/dicom2/13-017.dcm',
        'wadouri:/dicom2/13-018.dcm',
        'wadouri:/dicom2/13-019.dcm',
        'wadouri:/dicom2/13-020.dcm',
        'wadouri:/dicom2/13-021.dcm',
        'wadouri:/dicom2/13-022.dcm',
        'wadouri:/dicom2/13-023.dcm',
        'wadouri:/dicom2/13-024.dcm',
        'wadouri:/dicom2/13-025.dcm',
        'wadouri:/dicom2/13-026.dcm',
        'wadouri:/dicom2/13-027.dcm',
        'wadouri:/dicom2/13-028.dcm',
        'wadouri:/dicom2/13-029.dcm',
        'wadouri:/dicom2/14-001.dcm',
        'wadouri:/dicom2/14-002.dcm',
        'wadouri:/dicom2/14-003.dcm',
        'wadouri:/dicom2/14-004.dcm',
        'wadouri:/dicom2/14-005.dcm',
        'wadouri:/dicom2/14-006.dcm',
        'wadouri:/dicom2/14-007.dcm',
        'wadouri:/dicom2/14-008.dcm',
        'wadouri:/dicom2/14-009.dcm',
        'wadouri:/dicom2/14-010.dcm',
        'wadouri:/dicom2/14-011.dcm',
        'wadouri:/dicom2/14-012.dcm',
        'wadouri:/dicom2/14-013.dcm',
        'wadouri:/dicom2/14-014.dcm',
        'wadouri:/dicom2/14-015.dcm',
        'wadouri:/dicom2/14-016.dcm',
        'wadouri:/dicom2/14-017.dcm',
        'wadouri:/dicom2/14-018.dcm',
        'wadouri:/dicom2/14-019.dcm',
        'wadouri:/dicom2/14-020.dcm',
        'wadouri:/dicom2/14-021.dcm',
        'wadouri:/dicom2/14-022.dcm',
        'wadouri:/dicom2/14-023.dcm',
        'wadouri:/dicom2/14-024.dcm',
        'wadouri:/dicom2/14-025.dcm',
        'wadouri:/dicom2/14-026.dcm',
        'wadouri:/dicom2/14-027.dcm',
        'wadouri:/dicom2/14-028.dcm',
        'wadouri:/dicom2/14-029.dcm',
        'wadouri:/dicom2/14-030.dcm',
        'wadouri:/dicom2/15-001.dcm',
        'wadouri:/dicom2/15-002.dcm',
        'wadouri:/dicom2/15-003.dcm',
        'wadouri:/dicom2/15-004.dcm',
        'wadouri:/dicom2/15-005.dcm',
        'wadouri:/dicom2/15-006.dcm',
        'wadouri:/dicom2/15-007.dcm',
        'wadouri:/dicom2/15-008.dcm',
        'wadouri:/dicom2/15-009.dcm',
        'wadouri:/dicom2/15-010.dcm',
        'wadouri:/dicom2/15-011.dcm',
        'wadouri:/dicom2/15-012.dcm',
        'wadouri:/dicom2/15-013.dcm',
        'wadouri:/dicom2/15-014.dcm',
        'wadouri:/dicom2/15-015.dcm',
        'wadouri:/dicom2/15-016.dcm',
        'wadouri:/dicom2/15-017.dcm',
        'wadouri:/dicom2/15-018.dcm',
        'wadouri:/dicom2/15-019.dcm',
        'wadouri:/dicom2/15-020.dcm',
        'wadouri:/dicom2/15-021.dcm',
        'wadouri:/dicom2/15-022.dcm',
        'wadouri:/dicom2/15-023.dcm',
        'wadouri:/dicom2/15-024.dcm',
        'wadouri:/dicom2/15-025.dcm',
        'wadouri:/dicom2/15-026.dcm',
        'wadouri:/dicom2/15-027.dcm',
        'wadouri:/dicom2/15-028.dcm',
        'wadouri:/dicom2/15-029.dcm',
        'wadouri:/dicom2/15-030.dcm',
        'wadouri:/dicom2/16-001.dcm',
        'wadouri:/dicom2/16-002.dcm',
        'wadouri:/dicom2/16-003.dcm',
        'wadouri:/dicom2/16-004.dcm',
        'wadouri:/dicom2/16-005.dcm',
        'wadouri:/dicom2/16-006.dcm',
        'wadouri:/dicom2/16-007.dcm',
        'wadouri:/dicom2/16-008.dcm',
        'wadouri:/dicom2/16-009.dcm',
        'wadouri:/dicom2/16-010.dcm',
        'wadouri:/dicom2/16-011.dcm',
        'wadouri:/dicom2/16-012.dcm',
        'wadouri:/dicom2/16-013.dcm',
        'wadouri:/dicom2/16-014.dcm',
        'wadouri:/dicom2/16-015.dcm',
        'wadouri:/dicom2/16-016.dcm',
        'wadouri:/dicom2/16-017.dcm',
        'wadouri:/dicom2/16-018.dcm',
        'wadouri:/dicom2/16-019.dcm',
        'wadouri:/dicom2/16-020.dcm',
        'wadouri:/dicom2/16-021.dcm',
        'wadouri:/dicom2/16-022.dcm',
        'wadouri:/dicom2/16-023.dcm',
        'wadouri:/dicom2/16-024.dcm',
        'wadouri:/dicom2/16-025.dcm',
        'wadouri:/dicom2/16-026.dcm',
        'wadouri:/dicom2/16-027.dcm',
        'wadouri:/dicom2/16-028.dcm',
        'wadouri:/dicom2/16-029.dcm',
        'wadouri:/dicom2/16-030.dcm',
        'wadouri:/dicom2/17-001.dcm',
        'wadouri:/dicom2/17-002.dcm',
        'wadouri:/dicom2/17-003.dcm',
        'wadouri:/dicom2/17-004.dcm',
        'wadouri:/dicom2/17-005.dcm',
        'wadouri:/dicom2/17-006.dcm',
        'wadouri:/dicom2/17-007.dcm',
        'wadouri:/dicom2/17-008.dcm',
        'wadouri:/dicom2/17-009.dcm',
        'wadouri:/dicom2/17-010.dcm',
        'wadouri:/dicom2/17-011.dcm',
        'wadouri:/dicom2/17-012.dcm',
        'wadouri:/dicom2/17-013.dcm',
        'wadouri:/dicom2/17-014.dcm',
        'wadouri:/dicom2/17-015.dcm',
        'wadouri:/dicom2/17-016.dcm',
        'wadouri:/dicom2/17-017.dcm',
        'wadouri:/dicom2/17-018.dcm',
        'wadouri:/dicom2/17-019.dcm',
        'wadouri:/dicom2/17-020.dcm',
        'wadouri:/dicom2/17-021.dcm',
        'wadouri:/dicom2/17-022.dcm',
        'wadouri:/dicom2/17-023.dcm',
        'wadouri:/dicom2/17-024.dcm',
        'wadouri:/dicom2/17-025.dcm',
        'wadouri:/dicom2/17-026.dcm',
        'wadouri:/dicom2/17-027.dcm',
        'wadouri:/dicom2/17-028.dcm',
        'wadouri:/dicom2/17-029.dcm',
        'wadouri:/dicom2/18-001.dcm',
        'wadouri:/dicom2/18-002.dcm',
        'wadouri:/dicom2/18-003.dcm',
        'wadouri:/dicom2/18-004.dcm',
        'wadouri:/dicom2/18-005.dcm',
        'wadouri:/dicom2/18-006.dcm',
        'wadouri:/dicom2/18-007.dcm',
        'wadouri:/dicom2/18-008.dcm',
        'wadouri:/dicom2/18-009.dcm',
        'wadouri:/dicom2/18-010.dcm',
        'wadouri:/dicom2/18-011.dcm',
        'wadouri:/dicom2/18-012.dcm',
        'wadouri:/dicom2/18-013.dcm',
        'wadouri:/dicom2/18-014.dcm',
        'wadouri:/dicom2/18-015.dcm',
        'wadouri:/dicom2/18-016.dcm',
        'wadouri:/dicom2/18-017.dcm',
        'wadouri:/dicom2/18-018.dcm',
        'wadouri:/dicom2/18-019.dcm',
        'wadouri:/dicom2/18-020.dcm',
        'wadouri:/dicom2/18-021.dcm',
        'wadouri:/dicom2/18-022.dcm',
        'wadouri:/dicom2/18-023.dcm',
        'wadouri:/dicom2/18-024.dcm',
        'wadouri:/dicom2/18-025.dcm',
        'wadouri:/dicom2/18-026.dcm',
        'wadouri:/dicom2/18-027.dcm',
        'wadouri:/dicom2/18-028.dcm',
        'wadouri:/dicom2/18-029.dcm',
        'wadouri:/dicom2/18-030.dcm',
        'wadouri:/dicom2/19-001.dcm',
        'wadouri:/dicom2/19-002.dcm',
        'wadouri:/dicom2/19-003.dcm',
        'wadouri:/dicom2/19-004.dcm',
        'wadouri:/dicom2/19-005.dcm',
        'wadouri:/dicom2/19-006.dcm',
        'wadouri:/dicom2/19-007.dcm',
        'wadouri:/dicom2/19-008.dcm',
        'wadouri:/dicom2/19-009.dcm',
        'wadouri:/dicom2/19-010.dcm',
        'wadouri:/dicom2/19-011.dcm',
        'wadouri:/dicom2/19-012.dcm',
        'wadouri:/dicom2/19-013.dcm',
        'wadouri:/dicom2/19-014.dcm',
        'wadouri:/dicom2/19-015.dcm',
        'wadouri:/dicom2/19-016.dcm',
        'wadouri:/dicom2/19-017.dcm',
        'wadouri:/dicom2/19-018.dcm',
        'wadouri:/dicom2/19-019.dcm',
        'wadouri:/dicom2/19-020.dcm',
        'wadouri:/dicom2/19-021.dcm',
        'wadouri:/dicom2/19-022.dcm',
        'wadouri:/dicom2/19-023.dcm',
        'wadouri:/dicom2/19-024.dcm',
        'wadouri:/dicom2/19-025.dcm',
        'wadouri:/dicom2/19-026.dcm',
        'wadouri:/dicom2/19-027.dcm',
        'wadouri:/dicom2/19-028.dcm',
        'wadouri:/dicom2/19-029.dcm',
        'wadouri:/dicom2/19-030.dcm',
        'wadouri:/dicom2/19-031.dcm',
        'wadouri:/dicom2/19-032.dcm',
        'wadouri:/dicom2/19-033.dcm',
        'wadouri:/dicom2/19-034.dcm',
        'wadouri:/dicom2/19-035.dcm',
        'wadouri:/dicom2/19-036.dcm',
        'wadouri:/dicom2/19-037.dcm',
        'wadouri:/dicom2/19-038.dcm',
        'wadouri:/dicom2/19-039.dcm',
        'wadouri:/dicom2/19-040.dcm',
        'wadouri:/dicom2/19-041.dcm',
        'wadouri:/dicom2/19-042.dcm',
        'wadouri:/dicom2/19-043.dcm',
        'wadouri:/dicom2/19-044.dcm',
        'wadouri:/dicom2/19-045.dcm',
        'wadouri:/dicom2/19-046.dcm',
        'wadouri:/dicom2/19-047.dcm',
        'wadouri:/dicom2/19-048.dcm',
        'wadouri:/dicom2/19-049.dcm',
        'wadouri:/dicom2/19-050.dcm',
        'wadouri:/dicom2/19-051.dcm',
        'wadouri:/dicom2/19-052.dcm',
        'wadouri:/dicom2/19-053.dcm',
        'wadouri:/dicom2/19-054.dcm',
        'wadouri:/dicom2/19-055.dcm',
        'wadouri:/dicom2/19-056.dcm',
    ];
}//}}}
function getTestImageIds1() {//{{{
    return [
        'wadouri:/dicom/1-001.dcm',
        'wadouri:/dicom/1-002.dcm',
        'wadouri:/dicom/1-003.dcm',
        'wadouri:/dicom/1-004.dcm',
        'wadouri:/dicom/1-005.dcm',
        'wadouri:/dicom/1-006.dcm',
        'wadouri:/dicom/1-007.dcm',
        'wadouri:/dicom/1-008.dcm',
        'wadouri:/dicom/1-009.dcm',
        'wadouri:/dicom/1-010.dcm',
        'wadouri:/dicom/1-011.dcm',
        'wadouri:/dicom/1-012.dcm',
        'wadouri:/dicom/1-013.dcm',
        'wadouri:/dicom/1-014.dcm',
        'wadouri:/dicom/1-015.dcm',
        'wadouri:/dicom/1-016.dcm',
        'wadouri:/dicom/1-017.dcm',
        'wadouri:/dicom/1-018.dcm',
        'wadouri:/dicom/1-019.dcm',
        'wadouri:/dicom/1-020.dcm',
        'wadouri:/dicom/1-021.dcm',
        'wadouri:/dicom/1-022.dcm',
        'wadouri:/dicom/1-023.dcm',
        'wadouri:/dicom/1-024.dcm',
        'wadouri:/dicom/1-025.dcm',
        'wadouri:/dicom/1-026.dcm',
        'wadouri:/dicom/1-027.dcm',
        'wadouri:/dicom/1-028.dcm',
        'wadouri:/dicom/1-029.dcm',
        'wadouri:/dicom/1-030.dcm',
        'wadouri:/dicom/1-031.dcm',
        'wadouri:/dicom/1-032.dcm',
        'wadouri:/dicom/1-033.dcm',
        'wadouri:/dicom/1-034.dcm',
        'wadouri:/dicom/1-035.dcm',
        'wadouri:/dicom/1-036.dcm',
        'wadouri:/dicom/1-037.dcm',
        'wadouri:/dicom/1-038.dcm',
        'wadouri:/dicom/1-039.dcm',
        'wadouri:/dicom/1-040.dcm',
        'wadouri:/dicom/1-041.dcm',
        'wadouri:/dicom/1-042.dcm',
        'wadouri:/dicom/1-043.dcm',
        'wadouri:/dicom/1-044.dcm',
        'wadouri:/dicom/1-045.dcm',
        'wadouri:/dicom/1-046.dcm',
        'wadouri:/dicom/1-047.dcm',
        'wadouri:/dicom/1-048.dcm',
        'wadouri:/dicom/1-049.dcm',
        'wadouri:/dicom/1-050.dcm',
        'wadouri:/dicom/1-051.dcm',
        'wadouri:/dicom/1-052.dcm',
        'wadouri:/dicom/1-053.dcm',
        'wadouri:/dicom/1-054.dcm',
        'wadouri:/dicom/1-055.dcm',
        'wadouri:/dicom/1-056.dcm',
        'wadouri:/dicom/1-057.dcm',
        'wadouri:/dicom/1-058.dcm',
        'wadouri:/dicom/1-059.dcm',
        'wadouri:/dicom/1-060.dcm',
        'wadouri:/dicom/1-061.dcm',
        'wadouri:/dicom/1-062.dcm',
        'wadouri:/dicom/1-063.dcm',
        'wadouri:/dicom/1-064.dcm',
        'wadouri:/dicom/1-065.dcm',
        'wadouri:/dicom/1-066.dcm',
        'wadouri:/dicom/1-067.dcm',
        'wadouri:/dicom/1-068.dcm',
        'wadouri:/dicom/1-069.dcm',
        'wadouri:/dicom/1-070.dcm',
        'wadouri:/dicom/1-071.dcm',
        'wadouri:/dicom/1-072.dcm',
        'wadouri:/dicom/1-073.dcm',
        'wadouri:/dicom/1-074.dcm',
        'wadouri:/dicom/1-075.dcm',
        'wadouri:/dicom/1-076.dcm',
        'wadouri:/dicom/1-077.dcm',
        'wadouri:/dicom/1-078.dcm',
        'wadouri:/dicom/1-079.dcm',
        'wadouri:/dicom/1-080.dcm',
        'wadouri:/dicom/1-081.dcm',
        'wadouri:/dicom/1-082.dcm',
        'wadouri:/dicom/1-083.dcm',
        'wadouri:/dicom/1-084.dcm',
        'wadouri:/dicom/1-085.dcm',
        'wadouri:/dicom/1-086.dcm',
        'wadouri:/dicom/1-087.dcm',
        'wadouri:/dicom/1-088.dcm',
        'wadouri:/dicom/1-089.dcm',
        'wadouri:/dicom/1-090.dcm',
        'wadouri:/dicom/1-091.dcm',
        'wadouri:/dicom/1-092.dcm',
        'wadouri:/dicom/1-093.dcm',
        'wadouri:/dicom/1-094.dcm',
        'wadouri:/dicom/1-095.dcm',
        'wadouri:/dicom/1-096.dcm',
        'wadouri:/dicom/1-097.dcm',
        'wadouri:/dicom/1-098.dcm',
        'wadouri:/dicom/1-099.dcm',
        'wadouri:/dicom/1-100.dcm',
        'wadouri:/dicom/1-101.dcm',
        'wadouri:/dicom/1-102.dcm',
        'wadouri:/dicom/1-103.dcm',
        'wadouri:/dicom/1-104.dcm',
        'wadouri:/dicom/1-105.dcm',
        'wadouri:/dicom/1-106.dcm',
        'wadouri:/dicom/1-107.dcm',
        'wadouri:/dicom/1-108.dcm',
        'wadouri:/dicom/1-109.dcm',
        'wadouri:/dicom/1-110.dcm',
        'wadouri:/dicom/1-111.dcm',
        'wadouri:/dicom/1-112.dcm',
        'wadouri:/dicom/1-113.dcm',
        'wadouri:/dicom/1-114.dcm',
        'wadouri:/dicom/1-115.dcm',
    ];
}//}}}
function getTestImageIds3() {//{{{
    return [
        'wadouri:/dicom4/02ee66a26c489821f3c7d34a1d8b610a.dcm',
        'wadouri:/dicom4/046e70bcd3a521f1bbec586448e6df3e.dcm',
        'wadouri:/dicom4/06101f94dd2acf3fe1ed1e99e7f21b2f.dcm',
        'wadouri:/dicom4/068dd0e657735a8593a22aa082c22a84.dcm',
        'wadouri:/dicom4/076e0c2f210d890bd174cf2e181c6061.dcm',
        'wadouri:/dicom4/07808d276e3c5aa7a8ab550d7dc47dbf.dcm',
        'wadouri:/dicom4/091de443e2c8db9dec91033c2d9752c6.dcm',
        'wadouri:/dicom4/0a54ad813c4270575b6bf2f7998a8584.dcm',
        'wadouri:/dicom4/0ad2beb3d8d0552b129fe2beafddd0f3.dcm',
        'wadouri:/dicom4/0adc2c32bc2f7ead05a5b49a95b17bba.dcm',
        'wadouri:/dicom4/0c1fe352e4284e9241b3a9b382d7777b.dcm',
        'wadouri:/dicom4/0c541e2f3e8b2750a8da0b09d49caf02.dcm',
        'wadouri:/dicom4/0ce2e42dfa0f38920768544a9a0d869f.dcm',
        'wadouri:/dicom4/0d3acd326f6c2b817c1f37d91166cee4.dcm',
        'wadouri:/dicom4/0e0ffc6b0f45edf7372f09bdf7d3308f.dcm',
        'wadouri:/dicom4/1049289789cbdf95537543b860f85d7e.dcm',
        'wadouri:/dicom4/1081f559c8bfc42717935412cca9f7e9.dcm',
        'wadouri:/dicom4/10ad1505ff5f6c70e0f151fbef02ae0e.dcm',
        'wadouri:/dicom4/114ebc2f040dce6e7a0e16b4d2d67f04.dcm',
        'wadouri:/dicom4/117a922316fe8c94895245d2b932c983.dcm',
        'wadouri:/dicom4/11ceb964d54fe4d24566d2c431626943.dcm',
        'wadouri:/dicom4/120cced93fbc6ad5ba5ca3a85ec73eae.dcm',
        'wadouri:/dicom4/123e071df4da524603abfcbb1b06a9c9.dcm',
        'wadouri:/dicom4/1396197d19e4961a169520a247818dae.dcm',
        'wadouri:/dicom4/13c514d0fc2b5d31aac06fa902f08da3.dcm',
        'wadouri:/dicom4/14205eefca90e2feb0e29763a1adb322.dcm',
        'wadouri:/dicom4/146d384e2868eaccc98176773ace9171.dcm',
        'wadouri:/dicom4/14e049b78e2cdded4d79ca237ccd26f0.dcm',
        'wadouri:/dicom4/16bc7c8e6ee16e8c21e038d46e563d0c.dcm',
        'wadouri:/dicom4/181194dec1c33421bc4d4475948f450f.dcm',
        'wadouri:/dicom4/1ddffa5aa62a23629a9e018ff5f8cc9c.dcm',
        'wadouri:/dicom4/1e46c4bd029cbba14f6d1b12cdd85f42.dcm',
        'wadouri:/dicom4/1f98938520e443117eca1e505a2b96a2.dcm',
        'wadouri:/dicom4/1fa7cc69543c99535648308eb3d0e26d.dcm',
        'wadouri:/dicom4/1fa84083e205ae8c745f5bbafc87bbe8.dcm',
        'wadouri:/dicom4/2012bc32f8ebc180991dec10f7e9338b.dcm',
        'wadouri:/dicom4/206adc05bf94e1638772d208053b00cc.dcm',
        'wadouri:/dicom4/20bff90f0d39bdae9685e08db710f746.dcm',
        'wadouri:/dicom4/21f227480f4fa32160cf2aa1517f9b3f.dcm',
        'wadouri:/dicom4/23438d518b21f6f8929ffb68a0667d96.dcm',
        'wadouri:/dicom4/235be51ec2345e8940a375cd3c68917b.dcm',
        'wadouri:/dicom4/2397a4e65b40260dd83896c2e7bdef75.dcm',
        'wadouri:/dicom4/24b6fae63886bcf78cfa1941571abe56.dcm',
        'wadouri:/dicom4/255a56541cdaf4d745c2cec79114210d.dcm',
        'wadouri:/dicom4/264cc8f6bbc1005f42605270a446d9ae.dcm',
        'wadouri:/dicom4/2717db433ed27e8aa0dce04a28a20a94.dcm',
        'wadouri:/dicom4/2729116d09f30d51a26b98036b99d1fd.dcm',
        'wadouri:/dicom4/28e441d8c30400756f21b5ab989bacb7.dcm',
        'wadouri:/dicom4/2931cd5d304866a202b396962e8c2ce0.dcm',
        'wadouri:/dicom4/2a43e2c93299a48d2038fe70f25cecb0.dcm',
        'wadouri:/dicom4/2c2d315674286d902c3fb1931219b85b.dcm',
        'wadouri:/dicom4/2c7395f7626613e66c1ff69ce5924703.dcm',
        'wadouri:/dicom4/2c8e13290bb23945dbb6d84b622d5d6f.dcm',
        'wadouri:/dicom4/2df2c65c0bb7106b9a33206188c329aa.dcm',
        'wadouri:/dicom4/2f74ba703e378d59393085214b7988ae.dcm',
        'wadouri:/dicom4/2f8f8403d7db2117447005a4371339e4.dcm',
        'wadouri:/dicom4/2ff554a6dd108a69f439bbe00e46b0fe.dcm',
        'wadouri:/dicom4/30273e310df80821b9ed979a8ede49a7.dcm',
        'wadouri:/dicom4/303e86676e8e82959db5f56231e77398.dcm',
        'wadouri:/dicom4/30b4cdff31dfbf54c49544c7ec1a4641.dcm',
        'wadouri:/dicom4/30b4f94ffe7a5e0dd142df2abdd9b56c.dcm',
        'wadouri:/dicom4/311a4cc949d0909c70fb0d213cb9d94e.dcm',
        'wadouri:/dicom4/319f4a2b168b288d454dd98eeb091959.dcm',
        'wadouri:/dicom4/32ceb67030b75bd1808e32ba4ba3c4ed.dcm',
        'wadouri:/dicom4/332d3eaab64bebae22ba5ca40322a794.dcm',
        'wadouri:/dicom4/33478f939ad2b9083b3dfe917395871d.dcm',
        'wadouri:/dicom4/34d32e2c86dd77aa091056353fd1488b.dcm',
        'wadouri:/dicom4/380058dea0e9199cbbf867ddf4921165.dcm',
        'wadouri:/dicom4/38114eb93aa46d6c7925b607a3e07acb.dcm',
        'wadouri:/dicom4/3a1fcfbc2ad859c47531d1722fc3b958.dcm',
        'wadouri:/dicom4/3b23d31c44c6b4d70c931041aa5096c0.dcm',
        'wadouri:/dicom4/3c185c447f8f08742aeeb500b66601c2.dcm',
        'wadouri:/dicom4/3d18c2f98fb554e12aaccb6792b131cb.dcm',
        'wadouri:/dicom4/3d30a1531a29ae63500bf49a5b1c70d5.dcm',
        'wadouri:/dicom4/3d5ebf69a5a1e0172f085625d3dfb7e6.dcm',
        'wadouri:/dicom4/3d9fc0781ae5e3015af207aa1437d4e5.dcm',
        'wadouri:/dicom4/3dbef5820ae71a18102871ae8c4f1b27.dcm',
        'wadouri:/dicom4/3e8c6d2ae784d47e25066911a2624391.dcm',
        'wadouri:/dicom4/3f57e44a46537c3da409213b9c7be1bb.dcm',
        'wadouri:/dicom4/4011953c9892a0a73b0dca032fb9f559.dcm',
        'wadouri:/dicom4/4092ca135bc34a35a0982c89ebd5f0a9.dcm',
        'wadouri:/dicom4/414aff385f50a75b0c99169a26d835bd.dcm',
        'wadouri:/dicom4/4409fd59d5fcbd9a30a4a4e2d5b47d41.dcm',
        // 'wadouri:/dicom4/444f72529242ea0661ed9ee52ad16166.dcm',
        'wadouri:/dicom4/4651d3551d24a2f12c22df2e63db0026.dcm',
        'wadouri:/dicom4/46771a1530b3a4aa749f0030ec66150f.dcm',
        'wadouri:/dicom4/474f542119da4d421ecd404977b1065d.dcm',
        'wadouri:/dicom4/489f0ba430a4cf9efc9bd61d2b2718c0.dcm',
        'wadouri:/dicom4/4af364fba8c962baaa50e9597c574c03.dcm',
        'wadouri:/dicom4/4b5371c393294ddca514ad023043a38d.dcm',
        'wadouri:/dicom4/4c2f0af150ba9e549ae3b440ed0a6de9.dcm',
        'wadouri:/dicom4/4d7c7e1b6a48d79281a8ca3b9092875c.dcm',
        'wadouri:/dicom4/4e3ffe02f2e892c00093ede1240c02f6.dcm',
        'wadouri:/dicom4/4f17404a6d9a38c2bef3cb7268720def.dcm',
        'wadouri:/dicom4/4f3cd3af8c6c036e73a9bc485e43f641.dcm',
        'wadouri:/dicom4/5048c2d1c5450c0a5f9213a9498d6d75.dcm',
        'wadouri:/dicom4/50deb82a27ffc08051ad816d58b0f6bd.dcm',
        'wadouri:/dicom4/518decc81cca229f051067b62b049156.dcm',
        'wadouri:/dicom4/51b8cf94d15b7304500b4bcb97160c9f.dcm',
        'wadouri:/dicom4/51be1c1f2dc628d9828adf6a618a1391.dcm',
        'wadouri:/dicom4/5202ac0c80462d70f130f0be81348c3d.dcm',
        'wadouri:/dicom4/524afca627ef660d5f9bb664cadb1dce.dcm',
        'wadouri:/dicom4/52596d5e06e9533b1f1c184344db54bc.dcm',
        'wadouri:/dicom4/53b7d7e51c3aabb4c23349a9f2db5386.dcm',
        'wadouri:/dicom4/53fbd0a61197c3c7a2163ae7e376f582.dcm',
        'wadouri:/dicom4/54026d0ea87e8b770a9c7808caf7f36a.dcm',
        'wadouri:/dicom4/54eb84d5a80a370eb289209dac3193f7.dcm',
        'wadouri:/dicom4/5608f7878031b6ba10c4ad8143681a1d.dcm',
        'wadouri:/dicom4/56c4c20b0a2337e8f8f8dbf8c188214f.dcm',
        'wadouri:/dicom4/579a63459650ff42aa249e784c472903.dcm',
        'wadouri:/dicom4/57e861ac0c3a3aa24b51305346019738.dcm',
        'wadouri:/dicom4/597bd0b3580b2154e1588bf42e0a2c44.dcm',
        'wadouri:/dicom4/5afecfc68ccda42dcc5c364752957922.dcm',
        'wadouri:/dicom4/5baffbd940192c327e6b1b6446880dbc.dcm',
        'wadouri:/dicom4/5dd54592e57039cab832542abd78f249.dcm',
        'wadouri:/dicom4/605abff5ab537e2631b4ad8d7cb8ba26.dcm',
        'wadouri:/dicom4/60e3ff1caa5e35738abf3bbb8b4a5391.dcm',
        'wadouri:/dicom4/62539df9b42cac45e8f420dba68e9ae1.dcm',
        'wadouri:/dicom4/631f2bcdf18fc19d00f493b3723b2e14.dcm',
        'wadouri:/dicom4/632a1d1c6673b5bed636099aedeb6c2d.dcm',
        'wadouri:/dicom4/64f4903bb146eb8e74d2dac82f1edf57.dcm',
        'wadouri:/dicom4/6547c80b06b39b3529379893826442c3.dcm',
        'wadouri:/dicom4/65b8a6952b1129b84f62c2cf68223bd0.dcm',
        'wadouri:/dicom4/661586086bbfb64dfa2423599db620da.dcm',
        'wadouri:/dicom4/66551bd3d1abc822e15d1c1832c78f90.dcm',
        'wadouri:/dicom4/66e53bed7cfccd0f9925c198ccaf67f4.dcm',
        'wadouri:/dicom4/67c2b3a94c520539241cdcfce8e7959b.dcm',
        'wadouri:/dicom4/6a11019fc7b28aa450c12ceef187c62e.dcm',
        'wadouri:/dicom4/6c5f60a10dcd74de6f59c2cf5f245a5d.dcm',
        'wadouri:/dicom4/6c88a35ffb2fe3d42f113b3e4621aa28.dcm',
        'wadouri:/dicom4/6d4ed19a12bb944adb1d3f73f71ad54f.dcm',
        'wadouri:/dicom4/6f3878b050b1fd40b467884bab2a473a.dcm',
        'wadouri:/dicom4/6f53394926d424a23c78e7e0a4882f22.dcm',
        'wadouri:/dicom4/6fe3fe98d23a0de109a485b2c358aa36.dcm',
        'wadouri:/dicom4/7145675251ffd63fd191000c5f1b622c.dcm',
        'wadouri:/dicom4/72c1a11dcf23c72661df15c224541b31.dcm',
        'wadouri:/dicom4/73196bf50507e54cb61636367079eb30.dcm',
        'wadouri:/dicom4/755b550a3894f8c9663d62e65871b168.dcm',
        'wadouri:/dicom4/756b9667f922a3cf427819cb5e68c0c5.dcm',
        'wadouri:/dicom4/797b49478cbb524359fc11f663706dcb.dcm',
        'wadouri:/dicom4/7a4ff29d3ba80a733829694062232957.dcm',
        'wadouri:/dicom4/7bc8df0b6227c76b68cd3d8a38873957.dcm',
        'wadouri:/dicom4/7bcec098e74733bb3853ebe3a37b5113.dcm',
        'wadouri:/dicom4/7f2d94b1181c2278b9b2137afe5e7e0d.dcm',
        'wadouri:/dicom4/7fe2da48a2834a48dea3b900f0fb82c7.dcm',
        'wadouri:/dicom4/81851f1e43aaa1591a95dbafe0c7cbd2.dcm',
        'wadouri:/dicom4/830aa3571f487f6080bc18098dea1008.dcm',
        'wadouri:/dicom4/830b11ae23c6b6dc1506971ce0ddaa3e.dcm',
        'wadouri:/dicom4/832e8330ae4f6cdfe81bc2086a8f000d.dcm',
        'wadouri:/dicom4/84bad01297ee0bcfff54769e1be909e3.dcm',
        'wadouri:/dicom4/8696e542d67183517867235c52b91190.dcm',
        'wadouri:/dicom4/8749f35b45fbfb1195e1dcee3914b3e5.dcm',
        'wadouri:/dicom4/8879e9eddca6e6c13932e6230908e7a8.dcm',
        'wadouri:/dicom4/88b010fb4192b0fc68900700f110d2aa.dcm',
        'wadouri:/dicom4/8b3c9f289634e8d75928f9b845d92e0a.dcm',
        'wadouri:/dicom4/8b5d2b4de3727ab0f8f37837032be7fd.dcm',
        'wadouri:/dicom4/8f65e4c3409f19ffabbd603332b756da.dcm',
        'wadouri:/dicom4/924cb19c10902d9c8b9b420bf33bc3fb.dcm',
        'wadouri:/dicom4/955ee69f86b390444e33954d0f870ecf.dcm',
        'wadouri:/dicom4/95728c8f20511948fcd263696111ef2e.dcm',
        'wadouri:/dicom4/958dc03a3f0d1b3c59ab5e096efaee26.dcm',
        'wadouri:/dicom4/95b4b105b226f84c1b6d84573e718930.dcm',
        'wadouri:/dicom4/96304aac8091ce5d919cad177e15cdc9.dcm',
        'wadouri:/dicom4/978153ab21a12728941cfa54dc8293dd.dcm',
        'wadouri:/dicom4/988c8303f1cc36cd5d6c61491dd2a36f.dcm',
        'wadouri:/dicom4/98fba259d35c1deccacb8bae10b7c06e.dcm',
        'wadouri:/dicom4/99975bedb3a8cc046e974390d734e83a.dcm',
        'wadouri:/dicom4/9a9dc19fcbd24722942cb1472fe09ed4.dcm',
        'wadouri:/dicom4/9b1eb472462ddb9a4a45d14d29688067.dcm',
        'wadouri:/dicom4/9bfde4bc2b9620e49a36d51bfc1b628c.dcm',
        'wadouri:/dicom4/9ce6ef0351928ed0165d6228f733f3d9.dcm',
        'wadouri:/dicom4/9d382b2bd9221de37b8a332712c18bfe.dcm',
        'wadouri:/dicom4/9dccb79416ac9c7c548170f68793aaad.dcm',
        'wadouri:/dicom4/9e92a4a817fce70b5c7b08bb9094d3f1.dcm',
        'wadouri:/dicom4/9ed416de272cdc9e05df43687eb59901.dcm',
        'wadouri:/dicom4/9f364c907f28170700650d45946d3401.dcm',
        'wadouri:/dicom4/a13fc1441064f1d18afa742908e8bc07.dcm',
        'wadouri:/dicom4/a54921dd59236f696465e68f2d1edf30.dcm',
        'wadouri:/dicom4/a5831c842110b27a0732131a7dc37dec.dcm',
        'wadouri:/dicom4/a5b4b0472aaa848060451bcf555b6232.dcm',
        'wadouri:/dicom4/a6d1cbf2560b48bb6d53e96a7ced8223.dcm',
        'wadouri:/dicom4/aa3062ef862cc6dc42eb7af60cb44a89.dcm',
        'wadouri:/dicom4/adaaf0c2eae99c9ddbd094e4db7af5b8.dcm',
        'wadouri:/dicom4/aea0e817ebf3fc6a1e3484e924f19f2c.dcm',
        'wadouri:/dicom4/af71df283cc720a4ab48af840090a0f9.dcm',
        'wadouri:/dicom4/afb56c73640a4053155810206548cceb.dcm',
        'wadouri:/dicom4/afbbcc77e919fb33ee1dc513546d075d.dcm',
        'wadouri:/dicom4/afc47bdaa5341da10a8829e186997c70.dcm',
        'wadouri:/dicom4/b0343ccaaf2dbd966a24fd10d3534122.dcm',
        'wadouri:/dicom4/b5cde89747520fd6acb2fe5f03332bcc.dcm',
        'wadouri:/dicom4/b7ad4a3456609376ecc6e11317054527.dcm',
        'wadouri:/dicom4/b7b739a344bb8fa2db792e7e20ed4f33.dcm',
        'wadouri:/dicom4/b7b815f7fefe11e3ef755b8eafcd72a7.dcm',
        'wadouri:/dicom4/bb254bd0400431bda2e8b0d90948815d.dcm',
        'wadouri:/dicom4/bc268804c98fdcf119a2f8931a287e9b.dcm',
        'wadouri:/dicom4/be2c16ff396dbf9d034b48fe12ce6b13.dcm',
        'wadouri:/dicom4/be35ee8e87d3c6cd68038aeb51466d1c.dcm',
        'wadouri:/dicom4/bfdaad791d9488c2479a2fabf2e964fa.dcm',
        'wadouri:/dicom4/c04e60d0509b9ffb8fce4991610a59a5.dcm',
        'wadouri:/dicom4/c07d2a22820c90c8d7b3b23a9a820835.dcm',
        'wadouri:/dicom4/c1297771267298f177eaaeaf49523ed6.dcm',
        'wadouri:/dicom4/c27c76a5b927a79262094e5e5c515179.dcm',
        'wadouri:/dicom4/c3d115ad8fdca21f624f41846423e401.dcm',
        'wadouri:/dicom4/c5f496af1a1c97e628064373f813347c.dcm',
        'wadouri:/dicom4/c67083c2157e97963de1fd938612e208.dcm',
        'wadouri:/dicom4/c6b1ff286f55b6da9667ff246b724392.dcm',
        'wadouri:/dicom4/c6beb1cad89778ee0588479f23156a99.dcm',
        'wadouri:/dicom4/c6e7fc8c2dd4ca21ecb377d914684c9d.dcm',
        'wadouri:/dicom4/c7dc4e2ac67a92701e545fdb32dbda30.dcm',
        'wadouri:/dicom4/c9a2ac1ebe061a53272baf44fe6cb50e.dcm',
        'wadouri:/dicom4/c9d855dc1ee7fbcc8d4e4430169e18fb.dcm',
        'wadouri:/dicom4/ca9ac4aa5755b9099bd6114f1a578922.dcm',
        'wadouri:/dicom4/cbbc7b9ea23b0cc6c980a29a10e035ca.dcm',
        'wadouri:/dicom4/cf647c0ba0e70984d23c2dfa16726bbc.dcm',
        'wadouri:/dicom4/cfeda29e52ca5c73e6d71f74540f7776.dcm',
        'wadouri:/dicom4/d0ec81b5e774841c6740d124eb1381c0.dcm',
        'wadouri:/dicom4/d23510754e1b658d4f8c3ba73a9c257a.dcm',
        'wadouri:/dicom4/d29d6653a8e4b84f8fde819dec916769.dcm',
        'wadouri:/dicom4/d5469f5df6f7158751f095f38e9e7ce3.dcm',
        'wadouri:/dicom4/d5680382bbefc3ec5a48014b9556b30b.dcm',
        'wadouri:/dicom4/d6e5cda0158bc3dadc7ec02a38e647f0.dcm',
        'wadouri:/dicom4/d70df7a6a351fe26d041d962a09ef5f7.dcm',
        'wadouri:/dicom4/d8a1d09dea4593d8f2e1cdc6172413bc.dcm',
        'wadouri:/dicom4/d9b2f3b5759ac9723ef96fc849cf9330.dcm',
        'wadouri:/dicom4/d9bf59f1f17e575123d3b9d90c89a600.dcm',
        'wadouri:/dicom4/da2bc586f15a5baf1f75067dca667854.dcm',
        'wadouri:/dicom4/db89ad246dff79cc57975cbcdde6f45f.dcm',
        'wadouri:/dicom4/dc65b66606db09562c4232c4a07580db.dcm',
        'wadouri:/dicom4/dcd8d67d904ffa9d586d4b8365f4bade.dcm',
        'wadouri:/dicom4/dd1d93682e8087ab9e9a4ca628242dee.dcm',
        'wadouri:/dicom4/de43a6c77387aeeb6d170c16465eab31.dcm',
        'wadouri:/dicom4/dfd1ded7fb8fda28cf99b77d029e2bfc.dcm',
        'wadouri:/dicom4/e08f61739d994c44772d55c6b3a0bd8f.dcm',
        'wadouri:/dicom4/e133a1890eaf88bc0a2408572f5f5a39.dcm',
        'wadouri:/dicom4/e3dc7d0f5a6b86a8ca598257b5ad6762.dcm',
        'wadouri:/dicom4/e47e4ce9075f6cf9a8f595fc94f29e9b.dcm',
        'wadouri:/dicom4/e59deb6c16336cdb979e12e50cbc7789.dcm',
        'wadouri:/dicom4/e5bf85645e353057f388cef5ff056d31.dcm',
        'wadouri:/dicom4/e5c8fa1ec4b2b1be60dc3a51f63e74fa.dcm',
        'wadouri:/dicom4/e750cd31c0edd57f50a82b8cfacff444.dcm',
        'wadouri:/dicom4/e86195bab0324a1ccf87f84404a426cf.dcm',
        'wadouri:/dicom4/ec3790880b29f4dcf7fa8699678650d3.dcm',
        'wadouri:/dicom4/ecca14fcd9cc85a84643564c1f1d928b.dcm',
        'wadouri:/dicom4/edec3317a370fb32c901428de01cde73.dcm',
        'wadouri:/dicom4/ee54e53d2222a7f35195c4a451ec2d0f.dcm',
        'wadouri:/dicom4/ee68e513a554cc7aba5e7de5c4106009.dcm',
        'wadouri:/dicom4/eecfc56c162290f03d34fc2c73d595ae.dcm',
        'wadouri:/dicom4/eee1c11189c3dcac9315e51a9e99b4ca.dcm',
        'wadouri:/dicom4/ef45dfc4bef765cdd582dbd08e6438fb.dcm',
        'wadouri:/dicom4/f03c9efe6437c5cf49a0d7ce636c149b.dcm',
        'wadouri:/dicom4/f2c94f8d4d2634451c3aa71498fbb06c.dcm',
        'wadouri:/dicom4/f37df30fc050e6cd1b4262d11650af69.dcm',
        'wadouri:/dicom4/f3c0bb474ab60174f1d2a08e117656fc.dcm',
        'wadouri:/dicom4/f6b368a31bab8006244e5c72d4f89372.dcm',
        'wadouri:/dicom4/f79e78cd40e875f984aa3a214a33ff15.dcm',
        'wadouri:/dicom4/f7b1069b0233529638083d000e6eedc7.dcm',
        'wadouri:/dicom4/f82f5fc30df5bf00d91740c542a869c7.dcm',
        'wadouri:/dicom4/f9389e0ee6d7bc1d668c41f5dc81d760.dcm',
        'wadouri:/dicom4/f945b00de3a3bce16402c3da6c8d2f1d.dcm',
        'wadouri:/dicom4/fab56e6d4037f27947e6ba52f3a36592.dcm',
        'wadouri:/dicom4/fafdba2a8a02401dfd1aca5d90d0787c.dcm',
        'wadouri:/dicom4/fb32995a9614389ec3af42a2e8c80b02.dcm',
        'wadouri:/dicom4/fdc28173acac99eff1709653a5eb8926.dcm',
        'wadouri:/dicom4/ff683c7285ecbcd588cf238ef9bffb31.dcm',
        'wadouri:/dicom4/ff6ce9cdf8f049c97b4c32e4834c0299.dcm',
        'wadouri:/dicom4/ff85b5de4b428107841e991803d12345.dcm',
    ];
}//}}}

runFunction();

// vim: ts=4 sw=4 expandtab foldmethod=marker
