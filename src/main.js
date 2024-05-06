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

export async function runFunction() {
    await cornerstone.init();
    initCornerstoneDICOMImageLoader();
    initVolumeLoader();
    await csTools.init();

    const series_instance_uid = getSeriesFromURL();
    const imageIds = await getFilesForSeries(series_instance_uid);
    // document.getElementById("series").innerHTML = series_instance_uid;

/****************************************************************************
 *  BEGIN HTML modifying code - can this be moved to index.html?{{{
 ***************************************************************************/
    // const content = document.getElementById('content');

    // const viewportGrid = document.createElement('div');
    // viewportGrid.style.display = 'flex';
    // viewportGrid.style.flexDirection = 'row';

    // // element for axial view
    // const element1 = document.createElement('div');
    // element1.style.width = '500px';
    // element1.style.height = '500px';
    // // disable right-click on this element
    // element1.oncontextmenu = (e) => e.preventDefault();

    // // element for sagittal view
    // const element2 = document.createElement('div');
    // element2.style.width = '500px';
    // element2.style.height = '500px';
    // // disable right-click on this element
    // element2.oncontextmenu = (e) => e.preventDefault();

    // // element for 3d view
    // const element3 = document.createElement('div');
    // element3.style.width = '500px';
    // element3.style.height = '500px';
    // // disable right-click on this element
    // element3.oncontextmenu = (e) => e.preventDefault();

    // viewportGrid.appendChild(element1);
    // viewportGrid.appendChild(element2);
    // viewportGrid.appendChild(element3);

    // content.appendChild(viewportGrid);
    const element1 = document.getElementById('volumeContent');
    const element2 = document.getElementById('mipContent');
    const element3 = document.getElementById('t3dContent');

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

        // Top face coordinates for black boxing
        const bbTopLeft = [coords.x.min, coords.y.min];
        const bbBottomRight = [coords.x.max, coords.y.max];

        const topFaceCorners = [topLeft, topRight, bottomLeft, bottomRight];

        console.log("Coordinates of the corners of the top face:", topFaceCorners);

        // Calculate the center point
        const centerX = (topLeft[0] + topRight[0] + bottomLeft[0] + bottomRight[0]) / 4;
        const centerY = (topLeft[1] + topRight[1] + bottomLeft[1] + bottomRight[1]) / 4;
        const centerZ = (topLeft[2] + topRight[2] + bottomLeft[2] + bottomRight[2]) / 4;

        const centerPoint = [centerX, centerY, centerZ];

        console.log("Center point of the top face:", centerPoint);

        const radius = calculateDistance(topFaceCorners[0], centerPoint);
        const height = coords.z.max - coords.z.min;

        // experimental adjustment of coordinates for masker
        function invert(val, maxval) {
            return maxval - val
        }
        /*
         * Convert a point in LPS to RAS.
         * This just inverts the first two points (which is why it needs
         * the dims). This is only useful if the input is actually in LPS!
         */
        function convertLPStoRAS(point, dims) {
            const [ dimX, dimY, dimZ ] = dims;
            let [x, y, z] = point;
            x = invert(x, dimX);
            y = invert(y, dimY);

            return [ x, y, z];
        }
        function scaleBySpacing(point, spacings) {
            const [ spaceX, spaceY, spaceZ ] = spacings;
            let [x, y, z] = point;

            return [ Math.floor(x * spaceX),
                     Math.floor(y * spaceY),
                     Math.floor(z * spaceZ) ];
        }

        const [ dimX, dimY, dimZ ] = volumeDims;
        const [ spaceX, spaceY, spaceZ ] = volumeSpacing;

        // let [x, y, z] = centerPoint;
        // let x2 = invert(x, dimX) * spaceX;
        // let y2 = invert(y, dimY) * spaceY;
        // let z2 = z * spaceZ;

        let centerPointRAS = convertLPStoRAS(centerPoint, volumeDims);
        let centerPointFix = scaleBySpacing(centerPointRAS, volumeSpacing);

        const diameter = Math.floor((radius * spaceX) * 2);
        const i = Math.floor((centerPointRAS[2] - height) * spaceZ);

        // end experimental ----------------------------------------

        // output info
        document.getElementById("descriptionPanel").innerHTML = `
        <h3>Redaction input (black box)</h3>
        <pre>
        {"box": [${bbTopLeft}, ${bbBottomRight}, "black"]}
        </pre>

        <h3>Masker input</h3>
        <table>
        <tr>
            <td>LR</td>
            <td>${centerPointFix[0]}</td>
        </tr>
        <tr>
            <td>PA</td>
            <td>${centerPointFix[1]}</td>
        </tr>
        <tr>
            <td>S</td>
            <td>${centerPointFix[2]}</td>
        </tr>
        <tr>
            <td>I</td>
            <td>${i}</td>
        </tr>
        <tr>
            <td>diameter</td>
            <td>${diameter}</td>
        </tr>
        </table>
        <pre>
        masker -i src/${series_instance_uid} -o dst/ -c ${centerPointFix[0]} ${centerPointFix[1]} ${centerPointFix[2]} ${i} ${diameter}
        </pre>

        `;
    }

    /**
     * Reset the segmentation data
     */
    document.getElementById('markBad').onclick = async function() {
        const segmentationVolume = cornerstone.cache.getVolume(newSegmentationId);
        const scalarData = segmentationVolume.scalarData;
        scalarData.fill(0); // set entire array to 0s

        // Let the system know the seg data has been modified
        csTools.segmentation
            .triggerSegmentationEvents
            .triggerSegmentationDataModified(newSegmentationId);
    }

    document.getElementById('markGood').onclick = async function() {
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



// runFunction();

// vim: ts=4 sw=4 expandtab foldmethod=marker
