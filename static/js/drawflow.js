$(function() {

  const createNodeItem= function({label, icon}) {
    return(`
        <div class="title-box valign-wrapper">
          <i class="material-icons mr-2" style="width: 24px;">${icon}</i>
          <span>${label}</span>
        </div>
    `);
  };

  const createIncrementInput= function(property, {
    withDeleteButton= false,
    value= '',
    key= ''
  }= {}) {
    const display= (withDeleteButton) ? 'block': 'none';
    return(`
      <div class="input-group mb-2">
        <input type="text" name="key" placeholder="Key" class="form-control" value="${key}" data-property="${property}" auto/>
        <input type="text" name="value" placeholder="Value" class="form-control" value="${value}" data-property="${property}"/>
        <div class="input-group-append" style="display: ${display};">
          <button class="btn btn-outline-secondary" type="button"  data-property="${property}">-</button>
        </div>
      </div>
    `);
  };

  // restore wait_between_exec_duration
  let execDuration= localStorage.getItem('wait_between_exec_duration');
  $("#wait_between_exec_duration").val(execDuration);

  // restore enable
  const _enable= localStorage.getItem('enable');
  let enable= _enable=='true';
  const enableText= (enable) ? 'Enabled': 'Enable';
  $(".enable-value").prop('checked', enable);
  $(".enable-label").text(enableText);

  // localStorage.setItem('workspace', '');
  const saveWorkspace= function() {
    localStorage.setItem('workspace', JSON.stringify(editor.export()));
  };

  const [drawflowElement] = $("#drawflow");
  const editor = new Drawflow(drawflowElement);
  editor.reroute = true;
  const _workspace= localStorage.getItem('workspace');
  if(_workspace) {
    editor.drawflow= JSON.parse(_workspace);
  } else {
    editor.drawflow= {
      drawflow: {
        Home: {
          data: {
            0: {
              id: 0,
              name: 'trigger',
              data: {
                actionId: uuidv4()
              },
              class: 'event-trigger',
              html: createNodeItem({
                label: 'Event Trigger',
                icon: 'device_hub'
              }),
              typenode: false,
              inputs: {},
              outputs: {
                output_1: {
                  connections: []
                }
              },
              pos_x: 32,
              pos_y: 32
            }
          }
        }
      }
    };
  }
  editor.start();

  const exportWorkspace= function() {
    const {drawflow}= editor.export();
    const {data}= drawflow.Home;
    const dataList= Object.values(data);
    const eventTrigger= dataList.shift();
    const {
      condition_formula,
      sensor_id
    }= eventTrigger.data;
    const findNextAct= function(item) {
      return item.outputs.output_1.connections.map(function({node}) {
        return(data[node].data.actionId);
      });
    };
    const result= {
      wait_between_exec_duration: execDuration,
      trigger: {
        condition_formula,
        sensor_id,
        next_act: findNextAct(eventTrigger)
      },
      action: {
        list_action: []
      },
      enable
    };
    dataList.forEach(function(item) {
      result.action.list_action.push(item.data.actionId);
      result.action[item.data.actionId]= {
        act_metadata: {},
        next_act: findNextAct(item),
        name: item.data.actionName
      };
      let act_payload= {};
      let act_type= item.data.key;
      switch(item.data.key) {

        case 'write_file':
          act_payload= {
            data: item.data.data,
            path: item.data.path
          };
        break;

        case 'http':
          const header= item.data.headers.reduce(function(stack, item) {
            stack[item.key]= item.value;
            return(stack);
          }, {});
          act_payload= {
            header,
            method: item.data.method,
            body: item.data.body,
            url: item.data.url
          };
        break;

        case 'delay':
          act_payload= {
            duration: item.data.duration
          };
        break;

        case 'call_sensor':
          act_payload= {
            plugin_name: item.data.plugin_name,
            sensor_id: item.data.sensor_id,
            asset_id: item.data.asset_id
          };
        break;

        case 'push_mqtt':
          act_type= (item.data.broker=='Server') ? 'mqtt_server': 'mqtt_local';
          act_payload= {
            message: item.data.message
          };
        break;

      }
      Object.assign(result.action[item.data.actionId], {
        act_payload,
        act_type
      });
    });
    console.log(result);
  };

  [
    'connectionCreated',
    'connectionRemoved',
    'nodeCreated',
    'nodeRemoved',
    'nodeMoved'
  ].forEach(function(event) {
    editor.on(event, saveWorkspace);
  });

  // cancel cross connection
  editor.on('connectionCreated', function({output_class, input_class, output_id, input_id}) {
    const {outputs}= editor.getNodeFromId(input_id);
    if(outputs.output_1.connections.some(({node})=> (node==output_id))) {
      editor.removeSingleConnection(output_id, input_id, output_class, input_class);
    }
  });
  
  // save node id
  editor.on('nodeSelected', function(nodeId) {
    $.nodeId= nodeId;
  });

  editor.on('nodeMoved', function() {
    $.isNodeMoved= true;
  });


  $.dragMenu.forEach(function(item) {
    const payload= encodeURIComponent(JSON.stringify(item));
    const listItem= `
      <div class="list-group-item valign-wrapper drag-item" draggable="true" data-payload="${payload}">
        <i class="material-icons">${item.icon}</i>
        <span> &nbsp; ${item.label}</span>
      </div>
    `;
    $("#drag-menu").append(listItem);
  });

  // tmp
  const sensors= [
    {
      plugin_name: 'squash_plugin_ipcamera',
      sensor_name: 'Camera',
      sensor_id: '4a5a0ccd-a480-4c71-8789-99bf39e4c1e1',
      asset_id: 1
    },
    {
      plugin_name: 'squash_plugin_door',
      sensor_name: 'Door',
      sensor_id: '4a5a0ccd-a480-4c71-8789',
      asset_id: 2
    },
    {
      plugin_name: 'squash_plugin_',
      sensor_name: 'Suggest',
      sensor_id: '4c71-8789-99bf39e4c1e1',
      asset_id: 3
    }
  ];
  const suggestions= encodeURIComponent(JSON.stringify(sensors));
  $(".dropdown-autocomplete [data-suggestions]").data('suggestions', suggestions);

  $(".drag-item").on('dragstart', function(e) {
    const payload= $(this).data('payload');
    e.originalEvent.dataTransfer.setData('drag-item', payload);
    e.stopPropagation();
  });

  $("#drawflow").on('dragover', function(e) {
    e.preventDefault();
  });
  $("#drawflow").on('drop', function(e) {
    const payload= e.originalEvent.dataTransfer.getData('drag-item');
    const item= JSON.parse(decodeURIComponent(payload));
    const card= createNodeItem({
      label: item.label,
      icon: item.icon
    });
    const posX = e.clientX * ( editor.precanvas.clientWidth / (editor.precanvas.clientWidth * editor.zoom)) - (editor.precanvas.getBoundingClientRect().x * ( editor.precanvas.clientWidth / (editor.precanvas.clientWidth * editor.zoom)));
    const posY = e.clientY * ( editor.precanvas.clientHeight / (editor.precanvas.clientHeight * editor.zoom)) - (editor.precanvas.getBoundingClientRect().y * ( editor.precanvas.clientHeight / (editor.precanvas.clientHeight * editor.zoom)));
    item.actionId= uuidv4();
    editor.addNode(item.key, 1, 1, posX, posY, item.key, item, card);
  });
  
  // open drawer and set value
  $(document).on('click', ".title-box", function(e) {
    const nodeProps= editor.getNodeFromId($.nodeId);
    if(!$.isNodeMoved) {
      $(this).children("span").attr('id', "node-label-"+$.nodeId);
      // toggle form
      $("form[name]").each(function() {
        const $this= $(this);
        $this.attr('name')==nodeProps.name ? $this.show(): $this.hide();
      });
      // restore checkbox default value
      $(".form-check-input[name]").each(function() {
        const $this= $(this);
        const key= $this.attr('name');
        $this.prop('checked', $this.val()==nodeProps.data[key]);
      });
      // restore input default value
      $(".form-control[name], .form-text[name]").each(function() {
        const $this= $(this);
        const val= $this.hasClass('form-text') ? 'text': 'val';
        const key= $this.attr('name');
        $this[val](nodeProps.data[key] || '');
      });
      // restore increment input
      let headerEmptyCount= 0;
      $("#headers").empty();
      if(nodeProps.data?.headers && Array.isArray(nodeProps.data.headers)) {
        nodeProps.data.headers.forEach(function({value, key}) {
          if(!value && !key) ++headerEmptyCount;
          $("#headers").append(createIncrementInput('headers', {
            withDeleteButton: value || key,
            value,
            key
          }));
        });
      }
      headerEmptyCount<1 && $("#headers").append(createIncrementInput('headers'));
      $(".syntax-highlight-input").trigger('highlighting');
      $.openDrawer();
    }
    e.stopPropagation();
    e.preventDefault();
    $.isNodeMoved= false;
  });

  // close drawer
  $(document).on('click', "#drawer-mask, .close-drawer", function(e) {
    e.stopPropagation();
    e.preventDefault();
    $.closeDrawer();
  });

  // enable diasble
  $(".switch>input").on('change', function() {
    const $this= $(this);
    enable= $this.prop('checked');
    const checkText= (enable) ? 'Enabled': 'Enable';
    $this.closest(".form-group").find(".enable-label").text(checkText);
    localStorage.setItem('enable', enable);
  });

  $("#wait_between_exec_duration").on('keyup', function() {
    execDuration= $(this).val();
    localStorage.setItem('wait_between_exec_duration', execDuration);
  });

  // dropdown with suggestions
  $(".dropdown-autocomplete").on('shown.bs.dropdown', function() {
    $(this).find(".form-control").trigger('focus');
  });
  $(".dropdown-autocomplete .form-control").on('keyup focus', function() {
    const $this= $(this);
    const $dropdownItems= $this.parent().children(".dropdown-items").empty();
    const dataFor= $this.data('for');
    const suggestions= $dropdownItems.data('suggestions');
    JSON.parse(decodeURIComponent(suggestions)).filter(function(item) {
      const haystack= item.sensor_name?.toLocaleLowerCase();
      const needle= $this.val()?.toLocaleLowerCase();
      return haystack.includes(needle);
    }).forEach(function(item) {
      const dataProps= encodeURI(JSON.stringify(item));
      $dropdownItems.append(`
        <div class="media px-3 py-2" style="cursor: pointer;" data-props="${dataProps}">
          <span class="material-icons mr-3">camera_alt</span>
          <div class="media-body">
            <h6 class="my-0">${item.sensor_name}</h6>
            <small class="text-muted text-nowrap" for="${dataFor+'Id'}">${item.sensor_id}</small>
          </div>
        </div>
      `);
    });
  });

  // update data node (input/radio)
  $(".form-control[name], .form-check-input[name]").on('highlighting change keyup', function() {
    const $this= $(this);
    const value= $this.val();
    const key= $this.attr('name');
    editor.drawflow.drawflow.Home.data[$.nodeId].data[key]= value;
    if(key=='actionName') {
      const {data}= editor.getNodeFromId($.nodeId);
      editor.drawflow.drawflow.Home.data[$.nodeId].html= createNodeItem({
        label: value,
        icon: data.icon
      });
      $("#node-label-"+$.nodeId).text(value);
    }
    saveWorkspace();
  });

  // update data node (dropdown)
  $(document).on('click', ".dropdown-item[for]", function(e) {
    const $this= $(this);
    const value= $this.data('value');
    const key= $this.attr('for');
    editor.drawflow.drawflow.Home.data[$.nodeId].data[key]= value;
    $(`.form-control[name=${key}]`).val(value);
    e.preventDefault();
    saveWorkspace();
  });

  // update data node (media)
  $(document).on('click', ".dropdown-items>.media", function(e) {
    const $this= $(this);
    const $grandparent= $this.closest(".form-group");
    const props= JSON.parse(decodeURIComponent($this.data('props')));
    $grandparent.find(".form-control[readonly]").val(props.sensor_name);
    $grandparent.find(".form-text").text(props.sensor_id);
    Object.assign(editor.drawflow.drawflow.Home.data[$.nodeId].data, props);
    e.preventDefault();
    saveWorkspace();
  });

  // update data node (increment input)
  $(document).on('keyup', ".form-control[data-property]", function() {
    const $this= $(this);
    const $parent= $this.parent();
    const property= $this.data('property');
    const index= $parent.index();
    const value= $this.val();
    const name= $this.attr('name');
    // set value
    editor.drawflow.drawflow.Home.data[$.nodeId].data[property]||= [];
    editor.drawflow.drawflow.Home.data[$.nodeId].data[property][index]||= {};
    editor.drawflow.drawflow.Home.data[$.nodeId].data[property][index][name]= value;
    // increment input
    let headerEmptyCount= 0;
    $("#headers").children().each(function() {
      if($(this).children("input:inputEmpty").length>1) ++headerEmptyCount;
    });
    headerEmptyCount<1 && $("#headers").append(createIncrementInput('headers'));
    // show remove button
    $parent.children(".input-group-append").show();
    saveWorkspace();
  });

  // remove increment input
  $(document).on('click', ".btn[data-property]", function(e) {
    const $this= $(this);
    const $grandparent= $this.closest(".input-group");
    const property= $this.data('property');
    const index= $grandparent.index();
    editor.drawflow.drawflow.Home.data[$.nodeId].data[property].splice(index, 1);
    $grandparent.remove();
    e.stopPropagation();
    e.preventDefault();
    saveWorkspace();
  });

  $("#preview").click(function(e) {
    // console.log(JSON.stringify(editor.export()));
    console.log(editor.export());
    e.preventDefault();
  });


  $("#export").click(function(e) {
    // console.log(editor.export());
    e.preventDefault();
    exportWorkspace();
  });

});