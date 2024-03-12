import * as cornerstone from '@cornerstonejs/core';
import * as csTools from '@cornerstonejs/tools';

import { 
    initVolumeLoader,
    initCornerstoneDICOMImageLoader,
    expandSegTo3D,
    calculateDistance,
} from './utilities.js';

const { volumeLoader, utilities } = cornerstone;

let coords; // the coordinates of the 3d segmentation

async function runFunction() {
    await cornerstone.init();
    initCornerstoneDICOMImageLoader();
    initVolumeLoader();
    await csTools.init();

    const series_instance_uid = getSeriesFromURL();
    const imageIds = await getFilesForSeries(series_instance_uid);

/****************************************************************************
 *  BEGIN HTML modifying code - can this be moved to index.html?{{{
 ***************************************************************************/
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

/****************************************************************************
 *  END HTML modifying code
 ***************************************************************************///}}}


    const renderingEngineId = 'myRenderingEngine';
    const renderingEngine = new cornerstone.RenderingEngine(renderingEngineId);

    // note "cornerstoneStreamingImageVolume: " is required to
    // use the streaming volume loader
    const volumeId = 'cornerstoneStreamingImageVolume: myVolume';

    // Define a volume in memory
    const volume = await volumeLoader.createAndCacheVolume(
        volumeId, 
        { imageIds }
    );
    const volumeDims = volume.dimensions;
    const volumeSpacing = volume.spacing;
    // console.log(volumeDims, volumeSpacing);

    // setup viewports  {{{
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
    //}}}

    // setup toolgroups {{{
    csTools.addTool(csTools.RectangleScissorsTool);
    csTools.addTool(csTools.StackScrollMouseWheelTool);
    csTools.addTool(csTools.PanTool);
    csTools.addTool(csTools.ZoomTool);
    csTools.addTool(csTools.TrackballRotateTool);
    csTools.addTool(csTools.SegmentationDisplayTool);

    const toolGroupId = 'myToolGroup';
    const toolGroup = csTools.ToolGroupManager.createToolGroup(toolGroupId);
    toolGroup.addTool(csTools.StackScrollMouseWheelTool.toolName);
    toolGroup.addTool(csTools.RectangleScissorsTool.toolName);
    toolGroup.addTool(csTools.PanTool.toolName);
    toolGroup.addTool(csTools.ZoomTool.toolName);
    toolGroup.addTool(csTools.SegmentationDisplayTool.toolName);
    toolGroup.setToolEnabled(csTools.SegmentationDisplayTool.toolName);

    toolGroup.addViewport(viewportId1, renderingEngineId);
    toolGroup.addViewport(viewportId2, renderingEngineId);

    toolGroup.setToolActive(csTools.RectangleScissorsTool.toolName, {
        bindings: [
            {
                mouseButton: csTools.Enums.MouseBindings.Primary,
            },
        ]
    });
    toolGroup.setToolActive(csTools.PanTool.toolName, {
        bindings: [
            {
                mouseButton: csTools.Enums.MouseBindings.Auxiliary,
            },
        ]
    });
    toolGroup.setToolActive(csTools.ZoomTool.toolName, {
        bindings: [
            {
                mouseButton: csTools.Enums.MouseBindings.Secondary,
            },
        ]
    });

    toolGroup.setToolActive(csTools.StackScrollMouseWheelTool.toolName);

    // -----------------------------------------------------------------------
    // second toolGroup, for the 3d view
    // -----------------------------------------------------------------------

    const toolGroupId2 = 'my3dToolGroup';
    const toolGroup2 = csTools.ToolGroupManager.createToolGroup(toolGroupId2);

    toolGroup2.addTool(csTools.TrackballRotateTool.toolName);
    toolGroup2.addTool(csTools.SegmentationDisplayTool.toolName);
    toolGroup2.setToolEnabled(csTools.SegmentationDisplayTool.toolName);

    toolGroup2.addViewport(viewportId3, renderingEngineId);

    toolGroup2.setToolActive(csTools.TrackballRotateTool.toolName, {
        bindings: [
            {
                mouseButton: csTools.Enums.MouseBindings.Primary,
            },
        ]
    });//}}}

    // link volumes to viewports and configure {{{

    // Set the volume to load - this begins downloading the files?
    volume.load();

    // link the volume to the two 2d viewports
    await cornerstone.setVolumesForViewports(
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
              // slabThickness: 0.1,
          }
      ],
      [viewportId1, viewportId2]
    );

    // link the volume to the 3d viewport
    await cornerstone.setVolumesForViewports(
        renderingEngine, 
        [{ volumeId }], 
        [viewportId3]
    );

    // apply a rendering preset to the 3d view
    const viewport = renderingEngine.getViewport(viewportId3);
    const volumeActor = viewport.getDefaultActor().actor;

    utilities.applyPreset(
        volumeActor,
        cornerstone.CONSTANTS.VIEWPORT_PRESETS.find((preset) => preset.name === 'CT-Soft-Tissue')
    );

    viewport.render();
//}}}

    // setup empty segmentation {{{
    const newSegmentationId = 'newseg1';

    await volumeLoader.createAndCacheDerivedSegmentationVolume(volumeId, {
        volumeId: newSegmentationId,
    });

    csTools.segmentation.addSegmentations([
      {
        segmentationId: newSegmentationId,
        representation: {
          type: csTools.Enums.SegmentationRepresentations.Labelmap,
          data: {
            volumeId: newSegmentationId,
          },
        },
      },
    ]);

    await csTools.segmentation.addSegmentationRepresentations(
      toolGroupId,
      [
        {
          segmentationId: newSegmentationId,
          type: csTools.Enums.SegmentationRepresentations.Labelmap,
        },
      ]
    );
    //}}}

    // Render the image to the 2d viewports. The 3d was called earlier
    renderingEngine.renderViewports([viewportId1, viewportId2]);

    window.cornerstone = cornerstone;
    window.csTools = csTools;

    window.qdims = function() {
        // Extracting the coordinates of the corners of the top face
        const topLeft = [coords.x.min, coords.y.min, coords.z.max];
        const topRight = [coords.x.max, coords.y.min, coords.z.max];
        const bottomLeft = [coords.x.min, coords.y.max, coords.z.max];
        const bottomRight = [coords.x.max, coords.y.max, coords.z.max];

        const topFaceCorners = [topLeft, topRight, bottomLeft, bottomRight];

        console.log("Coordinates of the corners of the top face:", topFaceCorners);

        // Calculate the center point
        const centerX = (topLeft[0] + topRight[0] + bottomLeft[0] + bottomRight[0]) / 4;
        const centerY = (topLeft[1] + topRight[1] + bottomLeft[1] + bottomRight[1]) / 4;
        const centerZ = (topLeft[2] + topRight[2] + bottomLeft[2] + bottomRight[2]) / 4;

        const centerPoint = [centerX, centerY, centerZ];

        console.log("Center point of the top face:", centerPoint);

        let radius = calculateDistance(topFaceCorners[0], centerPoint);
        const height = coords.z.max - coords.z.min;

        // experimental adjustment of coordinates for masker
        const [ dimX, dimY, dimZ ] = volumeDims;
        const [ spaceX, spaceY, spaceZ ] = volumeSpacing;
        console.log("spacings:");
        console.log(spaceX, spaceY, spaceZ);
        console.log(centerPoint);
        let [x, y, z] = centerPoint;
        let x2 = x * spaceX;
        let y2 = dimY - (y * spaceY);
        let z2 = z * spaceZ;
        radius = (radius * spaceX) * 1.2;

        const i = (z - height) * spaceZ;

        const centerPointFix = [x2, y2, z2];

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
            <td>${centerPointFix}</td>
        </tr>
        <tr>
            <td>radius</td>
            <td>${radius}</td>
        </tr>
        <tr>
            <td>height</td>
            <td>${i}</td>
        </tr>
        </table>

        `;
    }

    /**
     * Reset the segmentation data
     */
    document.getElementById('btnReset').onclick = async function() {
        const segmentationVolume = cornerstone.cache.getVolume(newSegmentationId);
        const scalarData = segmentationVolume.scalarData;
        scalarData.fill(0); // set entire array to 0s

        // Let the system know the seg data has been modified
        csTools.segmentation
            .triggerSegmentationEvents
            .triggerSegmentationDataModified(newSegmentationId);
    }

    document.getElementById('btnExpand').onclick = async function() {
        coords = expandSegTo3D(newSegmentationId);

        // Let the system know the seg data has been modified
        csTools.segmentation
            .triggerSegmentationEvents
            .triggerSegmentationDataModified(newSegmentationId);

        window.qdims();

        // Render the LabelMap as a Surface in the 3d view
        await csTools.segmentation.addSegmentationRepresentations(
            toolGroupId2, [
            {
                segmentationId: newSegmentationId,
                type: csTools.Enums.SegmentationRepresentations.Surface,
                options: {
                    polySeg: {
                        enabled: true,
                    },
                },
            },
        ]);

    }
}

/**
 * Extract the series parameter from the URL in the browser
 */
function getSeriesFromURL() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const series = urlParams.get('series');

    // A simple default series (may not actually load)
    if (series === null) {
        return '1.3.6.1.4.1.14519.5.2.1.7777.3470.161535129288433886024702756456';
    }
    return series;
}

/**
 * Get a list of imageIds from Posda for a given series
 * TODO: Add parameter for activity_id or activity_timepoint_id
 */
async function getFilesForSeries(series) {
    const response = await fetch(`/papi/v1/series/${series}/files`);
    const files = await response.json();

    const newfiles = files.file_ids.map((file_id) => {
        return "wadouri:/papi/v1/files/" + file_id + "/data";
    });

    return newfiles;
}

runFunction();

// vim: ts=4 sw=4 expandtab foldmethod=marker
