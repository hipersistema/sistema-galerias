/* ===== i18n.js · Español ⇄ 中文 =====
   Se incluye en CADA página justo antes de </body>:  <script src="i18n.js"></script>
   - Traduce el texto fijo y el que la página genera después (tablas, avisos, confirmaciones).
   - Nunca toca datos: nombres, productos y códigos no están en el diccionario, así que quedan igual.
   - Para traducir más textos solo hay que añadir líneas a ES2ZH (o a PATRONES si el texto lleva datos variables).
   - Para ver qué falta en una página: cambia a 中文, y en la consola (F12) escribe  i18nFaltantes()  */
(function () {
  const KEY = 'hipergalerias_lang';

  const ES2ZH = {
    // ---- Cabecera y menú ----
    'Pase de Salida - Empleados': '放行单 - 员工',
    'Volver al inicio': '返回首页', 'Inicio': '首页',
    'Descuentos a Empleados': '员工折扣与扣款',
    'Usuario': '用户', 'Modo oscuro': '深色模式', 'Modo claro': '浅色模式',
    'Cambiar modo oscuro': '切换深色模式', 'Cambiar a modo oscuro': '切换至深色模式',
    'Cerrar sesión': '退出登录', 'Iniciar sesión': '登录',
    'Asigna mercancía con descuento, controls saldos por trabajador y genera el pase de salida para Control.':
      '分配折扣商品，按员工管理余额，并为控制部门生成放行单。',
    'Cambiar tema': '切换主题',
    'Verificando sesión…': '验证会话……',
    'Cargando': '正在加载',
    'Cerrar': '关闭',

    // ---- Panel Principal / Index ----
    'Panel Principal - Hipergalerias': '主面板 - Hipergalerias',
    'Cambiar entre modo claro y oscuro': '在浅色模式和深色模式之间切换',
    'Activar modo oscuro': '启用深色模式',
    'Productos con más de 30 días para vencer': '距保质期还有30天以上的产品',
    'Productos que vencen en 30 días o menos': '保质期在30天或以内的产品',
    'Productos con fecha de vencimiento pasada': '已过保质期的产品',
    'Empleados con deuda y ningún abono': '有欠款且未还款的员工',
    'Empleados con deuda y abono parcial': '有欠款且已部分还款的员工',
    'Monto total pendiente de cobro': '待收款总额',
    'Recetas guardadas en el catálogo': '保存在产品目录中的食谱',
    'Insumos e ingredientes registrados': '已登记的原材料和配料',
    'Equipos registrados': '已登记的设备',
    'Mantenimientos por realizar': '待执行的维护任务',
    'Cambios registrados hoy': '今日记录的变更',
    'Eventos críticos o de atención sin revisar': '未审核的重大事件或需关注事项',
    'usuario@hipergalerias.com': 'usuario@hipergalerias.com',
    'Saltar al contenido': '跳转至内容',
    'HIPERGALERIAS': 'HIPERGALERÍAS',
    'Sistema Centralizado de Gestión': '集中管理系统',
    '+ Crear usuario': '＋ 创建用户',
    '＋ Crear usuario': '＋ 创建用户',
    'Panel de Control Ejecutivo': '高管控制面板',
    'Supervisión general de operaciones, inventarios, costos y sistemas de Hipergalerías.': '对HIPERGALERÍAS的运营、库存、成本及系统的全面监督。',
    'Módulos del sistema': '系统模块',
    'Recepción y Fechas': '收货与日期',
    'Registro de mercancía y control de vencimientos.': '商品登记与保质期控制',
    'Óptimos': '最佳状态',
    'Por Vencer': '即将过期',
    'Vencidos': '已过期',
    'Ingresar al Módulo': '进入模块',
    'Descuentos para Empleados': '员工折扣',
    'Cobro de productos al personal.': '向员工收取商品费用',
    'Pend. Pago': '待付款',
    'Por Cobrar': '应收款',
    'Recetas y Costos': '配方与成本',
    'Escandallos, insumos y precios sugeridos.': '成本核算、原材料及建议价格。',
    'Recetas': '配方',
    'Ingredientes': '原料',
    'TI Equipos': 'IT设备',
    'Inventario y mantenimiento de equipos.': '设备库存与维护。',
    'Equipos TI': 'IT设备',
    'Mant. Pendientes': '维护 待处理',
    'Auditoría': '审计',
    'Quién cambió qué, cuándo y por qué en todos los módulos.': '所有模块中谁在何时因何原因进行了哪些更改',
    'Cambios hoy': '今日变更',
    'Sin revisar': '未审核',
    'Pendiente 5': '待处理 5',
    'Pendiente 6': '待处理 6',
    'Módulo reservado para una próxima fase.': '为下一阶段预留的模块',
    'Estado': '状态',
    'Próximamente': '即将推出',
    'Fase': '阶段',
    'No disponible aún': '尚未可用',

    // ---- Recepción y Fechas (Modulo recepcionyfechas.html) ----
    'Recepción de Producto - Hipergalerias': '产品收货 - 大型超市',
    'Recepción y control de fechas de productos': '产品收货与日期核对',
    'Descarga una copia de todos los registros en JSON': '下载所有记录的JSON格式副本',
    '💾 Exportar respaldo': '💾 导出备份',
    '📥 Registrar recepción de producto': '📥 登记产品收货',
    'Los campos con * son obligatorios. Atajos:': '带*的字段为必填项。快捷键：',
    'buscar ·': '搜索 ·',
    'Ctrl': 'Ctrl',
    'Enter': 'Enter',
    'guardar ·': '保存 ·',
    'Esc': 'Esc',
    'cerrar o cancelar.': '关闭或取消。',
    'INT-001': 'INT-001',
    'Ej. MARGARINA MAVESA 500G': '例如：MAVESA 500克人造黄油',
    'EJ. VÍVERES': '例如：食品',
    'Ej. ALFONZO RIVAS': '例如：ALFONZO RIVAS',
    'FAC-9921': 'FAC-9921',
    'Nombre de quien recibe': '收货人姓名',
    'LOTE-100': '批次-100',
    'Detalles o novedades de la mercancía...': '商品详情或最新动态...',
    'Cód. barra': '条形码',
    'Cód. interno': '内部编码',
    'Descripción del producto': '产品描述',
    'Compra y recepción': '采购与收货',
    'Proveedor': '供应商',
    'N° de factura': '发票号',
    'Recibe': '收货人',
    'N° de lote': '批号',
    'Cantidades, costos y fechas': '数量、成本和日期',
    'Costo unitario ($)': '单价（$）',
    'Costo total ($)': '总成本（$）',
    'Fecha de recepción': '收货日期',
    'Fecha de caducidad': '保质期',
    'Observaciones': '备注',
    'Guardar registro': '保存记录',
    'Cancelar edición': '取消编辑',
    '🗑️ Eliminar este registro': '🗑️ 删除此记录',
    'Mostrar solo productos óptimos': '仅显示最佳状态商品',
    'Mostrar solo productos por vencer': '仅显示临近保质期商品',
    'Mostrar solo productos vencidos': '仅显示过期商品',
    'Filtrar por estado': '按状态筛选',
    'Óptimos (más de 30 días)': '最佳期（超过30天）',
    'Por vencer (30 días o menos)': '临期（30天或以内）',
    'Todos': '全部',
    '⚠️ Por vencer': '⚠️ 即将过期',
    '🚫 Inhabilitados': '🚫 已禁用',
    'Buscar registros': '搜索记录',
    'Buscar por código, producto, factura…  ( / )': '按代码、商品、发票等搜索… ( / )',
    'Limpiar búsqueda': '清除搜索',
    'Descarga en Excel lo que se ve con el filtro actual': '将当前筛选结果导出为Excel文件',
    '📥 Descargar en Excel': '📥 下载为Excel',
    'Haz clic (o pulsa Enter) en una fila para ver sus acciones. Ordena con los encabezados': '💡 点击（或按Enter键）某一行以查看其操作。按标题排序',
    'F. recepción': '收货日期',
    'F. vencimiento': '到期日期',
    'Dpto.': '部门',
    'Lote': '批次',
    'Detalle del producto': '产品详情',
    'Cód. barra / interno': '条形码/内部编码',
    'N° factura / lote': '发票号/批次号',
    'Cantidad y costos': '数量和成本',
    '🗑️ Eliminar': '🗑️ 删除',
    '🚫 Inhabilitar': '🚫 禁用',
    '📘 Kardex': '📘 Kardex',
    '✏️ Editar': '✏️ 编辑',
    '⚠️ Acción protegida': '⚠️ 受保护的操作',
    'Ingresa la clave de seguridad para eliminar:': '输入安全密码以删除：',
    'Clave de seguridad': '安全密码',
    'Confirmar': '确认',

    // ---- Resumen y pestañas ----
    'Pend. pago': '待付款', 'Parciales': '部分还款', 'Liquidados': '已结清', 'Por cobrar': '应收款',
    'Asignación': '分配', 'Empleados': '员工', 'Artículos': '商品',
    // ---- Asignación ----
    'Asignar artículos con descuento': '分配折扣商品',
    'Aplicar % de descuento': '应用折扣百分比',
    '1. Empleado (cédula o nombre)': '1. 员工（身份证号或姓名）',
    'Busca al empleado...': '搜索员工...',
    'Producto / dañado / por vencer': '商品 / 损坏品 / 临期品',
    'Producto o código...': '商品或编码...',
    'Producto': '商品', 'Precio base ($)': '基础价格 ($)', 'Precio base': '基础价格',
    '% Desc.': '折扣%', 'Porcentaje de descuento': '折扣百分比',
    'Precio c/ desc. ($)': '折后价 ($)', 'Precio con descuento': '折后价格',
    'Cant.': '数量', 'Cantidad': '数量',
    'Total a deber ($)': '应还合计 ($)', 'Total a deber': '应还合计',
    'Quitar este producto': '移除此商品', 'Quitar producto': '移除商品',
    'Añadir producto': '添加商品', 'Total de la tanda:': '本批合计：', 'Asignar deuda': '登记欠款',
    'Estado de cuentas por trabajador': '员工账户状态',
    'Desde': '起始', 'Hasta': '截止', 'Imprimir pase de salida': '打印放行单',
    'Filtrar por cédula o nombre...': '按身份证号或姓名筛选...',
    'Cédula': '身份证号', 'Empleado': '员工', 'Ítems': '项数', 'Última asignación': '最近分配',
    'Deuda total': '欠款总额', 'Abonado': '已还', 'Saldo pendiente': '未还余额',
    'Estatus': '状态', 'Acciones': '操作',
    'LIQUIDADO': '已结清', 'PARCIAL': '部分', 'PENDIENTE': '待付', 'Ver detalle': '查看详情',
    'Aún no hay cuentas activas.': '暂无活跃账户。',
    // ---- Empleados ----
    'Lista de empleados': '员工列表', 'Agregar empleado': '添加员工',
    'Nombre completo': '姓名', 'Cargo / puesto': '职位', 'Fecha de ingreso': '入职日期',
    'Registrar empleado': '登记员工', 'Buscar empleado...': '搜索员工...',
    'Nro': '序号', 'Fecha ingreso': '入职日期', 'Acción': '操作',
    'Aún no hay empleados registrados.': '暂无已登记员工。',
    // ---- Artículos ----
    'Artículos del supermercado': '超市商品',
    'Agregar producto / dañado / por vencer': '添加商品 / 损坏品 / 临期品',
    'Código de barras': '条形码', 'Código interno': '内部编码', 'Descripción': '描述',
    'Departamento': '部门', 'Registrar producto': '登记商品',
    'Buscar artículo o código...': '搜索商品或编码...',
    'No hay artículos que coincidan.': '没有匹配的商品。',
    // ---- Paginación ----
    'Mostrando': '显示', 'de': '/', 'registros': '条记录', 'Página': '页码',
    'Anterior': '上一页', 'Siguiente': '下一页',
    // ---- Modal de clave ----
    'Autorización gerencial': '管理层授权',
    'Ingresa la clave para autorizar la acción.': '请输入授权密码以确认此操作。',
    'Clave de autorización': '授权密码', 'Cancelar': '取消',
    'Verificar y continuar': '验证并继续', 'Verificando...': '验证中...', 'Verificando…': '验证中…',
    'Recordar clave de autorización (solo por esta sesión)': '记住授权密码（仅限本次会话）',
    // ---- Modal de descuento ----
    'Planificar descuento de quincena': '安排半月工资扣款',
    'Detalle de compras': '购买明细', 'Empleado:': '员工：',
    'Deuda ($)': '欠款 ($)', 'Abonado ($)': '已还 ($)', 'Saldo ($)': '余额 ($)',
    'Monto a descontar ($)': '扣款金额 ($)',
    'Eliminar este ítem': '删除此项',
    'Eliminar cuenta completa': '删除整个账户', 'Procesar descuento': '执行扣款',
    // ---- Inicio de sesión ----
    'Acceso al Sistema': '系统登录',
    'Ingresa tus credenciales corporativas para continuar.': '请输入公司账号凭证以继续。',
    'Correo electrónico': '电子邮箱', 'Contraseña': '密码',
    'Mostrar contraseña': '显示密码', 'Ocultar contraseña': '隐藏密码',
    'Mostrar u ocultar contraseña': '显示或隐藏密码',
    'Bloq Mayús está activado': '大写锁定已开启',
    'Recordar mi correo': '记住我的邮箱', 'Ingresar': '登录',
    '🔒 Acceso restringido · Hipergalerias C.A.': '🔒 限制访问 · Hipergalerias C.A.',
    'Credenciales incorrectas. Revisa tu correo y contraseña e inténtalo de nuevo.': '凭证错误。请检查邮箱和密码后重试。',
    'No se pudo iniciar sesión. Revisa tu conexión.': '登录失败，请检查网络连接。',
    "No se encontró la configuración de Supabase en 'conexion.js'.": "未在 'conexion.js' 中找到 Supabase 配置。",
    'Asigna mercancía con descuento, controla saldos por trabajador y genera el pase de salida para Control.': '分配打折商品，控制每位员工的库存余额，并为“控制”部门生成出库单。',
    // ---- Hoja de impresión ----
    'PASE DE SALIDA DE MERCADERÍA PARA PERSONAL': '员工商品放行单',
    'NRO': '序号', 'CÉDULA': '身份证号', 'NOMBRES Y APELLIDOS': '姓名',
    'CÓDIGO ARTÍCULO': '商品编码', 'DESCRIPCIÓN DEL ARTÍCULO': '商品描述', 'CANTIDAD': '数量',
    'FECHA': '日期', 'AUTORIZADO POR (GERENCIA)': '授权人（管理层）',
    'REVISADO POR (CONTROL)': '审核人（控制部门）', 'Nombre y firma': '姓名及签名',
    // ---- Avisos y confirmaciones ----
    'Sincronizando con Supabase...': '正在与 Supabase 同步...',
    'Sincronización finalizada': '同步完成',
    'Error en la carga desde Supabase': '从 Supabase 加载数据出错',
    'Selecciona un empleado de la lista de sugerencias': '请从建议列表中选择员工',
    'Agrega al menos un producto a la tanda': '请至少添加一件商品',
    'Empleado registrado': '员工已登记', 'Empleado eliminado': '员工已删除',
    'Artículo registrado': '商品已登记',
    'Sin conexión a Supabase: no se puede registrar el artículo': '未连接 Supabase：无法登记商品',
    'Por favor ingresa la clave de autorización': '请输入授权密码',
    'Clave de autorización incorrecta o no válida': '授权密码错误或无效',
    '¿Deseas eliminar este registro de deuda permanentemente?': '确定要永久删除这条欠款记录吗？',
    'Registro eliminado correctamente': '记录已成功删除',
    '¿Seguro de eliminar TODA la cuenta y compras de este empleado?': '确定要删除该员工的整个账户及所有购买记录吗？',
    'Cuenta eliminada por completo': '账户已完全删除',
    'El monto a descontar debe ser mayor a 0': '扣款金额必须大于 0',
    'El monto no puede superar el saldo pendiente': '金额不能超过未还余额',
    'Descuento de quincena procesado': '半月扣款已处理',
    'Esta cuenta no tiene descuentos para revertir': '此账户没有可撤销的扣款',
    'La fecha "Desde" no puede ser posterior a "Hasta"': '"起始"日期不能晚于"截止"日期',

    // ---- Escandallos, Recetarios y Costos ----
    "Sistema de Escandallos y Costos - Hipergalerias": "标价与成本系统 - 大型超市",
    "🔍 Buscar entre los artículos...": "🔍 在商品中搜索……",
    "Ej. GALLETAS NEW YORK": "例如：NEW YORK 饼干",
    "🔍 Buscar receta o categoría...": "🔍 搜索食谱或分类……",
    "Seleccionar todas": "全选",
    "🔍 Buscar...": "🔍 搜索...",
    "Ej. POLLO A LA BROASTER": "例如：BROASTER炸鸡",
    "Ej. QUESO CHEDDAR LA DORADA 1KG": "例如：LA DORADA切达奶酪 1公斤",
    "RECETARIOS Y COSTOS": "食谱与成本",
    "Control de producción, recetas y rentabilidad - Hipergalerias": "生产控制、食谱与盈利能力 - Hipergalerias",
    "💾 Respaldar": "💾 备份",
    "📦 INGREDIENTES Y BASES": "📦 原料与基料",
    "🍳 CREADOR DE RECETAS": "🍳 食谱创建器",
    "📊 COSTOS Y CATALOGO": "📊 成本与目录",
    "📥 IMPORTAR / REVISIÓN": "📥 导入/审核",
    "⭐ Sub-Receta": "⭐ 子配方",
    "+ Nuevo Insumo": "+ 新原料",
    "Código Interno": "内部代码",
    "Descripción del Producto": "产品描述",
    "Unidad": "单位",
    "Precio de Costo ($)": "成本价 ($)",
    "Precio de Venta ($)": "售价 ($)",
    "Acciones Protegidas": "受保护操作",
    "Datos Principales de la Preparación": "制作主要信息",
    "Cancelar Edición": "取消编辑",
    "Nombre de la Receta / Producto": "食谱/产品名称",
    "Área / Categoría": "领域/类别",
    "Panadería": "面包房",
    "Pastelería": "糕点店",
    "Masas y Bases (Sub-receta)": "面团与基底（子配方）",
    "Guisos y Salsas (Sub-receta)": "炖菜与酱汁（子配方）",
    "Pizzería": "披萨店",
    "Cocina Gourmet": "美食厨房",
    "Charcutería": "熟食店",
    "Cafetería": "咖啡厅",
    "Tipo de Cálculo / Venta": "计算/销售类型",
    "Venta por UNIDADES / RACIÓN": "按件/份销售",
    "Venta por KG / LT": "按公斤/升销售",
    "Peso Neto del Lote": "批次净重",
    "Rendimiento en Piezas / Unidades": "件数/单位产量",
    "Unidad de Medida Base": "基本计量单位",
    "Unidades (UND)": "单位（UND）",
    "Kilogramos (kg)": "千克 (kg)",
    "Litros (lt)": "升 (lt)",
    "Gramos (g)": "克 (g)",
    "Mililitros (ml)": "毫升 (ml)",
    "Paquete (paq)": "包装 (包)",
    "⭐ Registrar también como Producto Base / Sub-receta (Disponible para otras recetas)": "⭐ 同时注册为基础产品/子配方（可供其他配方使用）",
    "⚖️ ¿La receta lleva merma?": "⚖️ 该配方是否包含损耗？",
    "Merma total de la receta": "配方总损耗",
    "Unidad de la merma": "损耗单位",
    "Ingredientes y Productos Base": "原料与基础产品",
    "+ Agregar Fila": "+ 添加行",
    "Ingrediente / Base": "原料 / 基础产品",
    "Cant. Bruta": "毛量",
    "P. Venta Usado ($)": "P. 销售使用额 ($)",
    "Total ($)": "总计 ($)",
    "Análisis de Costos y PVP": "成本与零售价分析",
    "Costo Total Lote (Batch):": "批次总成本 (Batch)：",
    "Costo Unitario / UNIDAD:": "单位成本 / 单位：",
    "Factor de Utilidad (Ej. 1.3 = 30%, 1.4 = 40%)": "利用率系数（例如 1.3 = 30%，1.4 = 40%）",
    "Factor": "系数",
    "PVP SUGERIDO (POR UNIDAD):": "建议零售价（按单位）：",
    "Ganancia Estimada por UNIDAD:": "每单位预计利润：",
    "💾 Guardar Producto en Catálogo": "💾 保存产品至目录",
    "Lista de Recetas y Productos Guardados": "已保存食谱与产品列表",
    "🖨 Imprimir Seleccionadas": "🖨 打印所选项",
    "Producto / Receta": "产品 / 食谱",
    "Categoría": "类别",
    "Tipo / Rendimiento": "类型 / 产量",
    "Costo Unitario ($)": "单位成本 ($)",
    "Utilidad": "利用率/利润",
    "PVP Sugerido ($)": "建议零售价 ($)",
    "Recetas pendientes de revisión": "待审核食谱",
    "Carga": "加载",
    "recetas_importacion.json": "recetas_importacion.json",
    "(generado del Excel). Revisa, corrige y aprueba: solo las aprobadas entran al catálogo.": "(由 Excel 生成)。检查、更正并批准：仅批准的项目会进入目录。",
    "📂 Cargar JSON": "📂 加载 JSON",
    "Todas": "全部",
    "✅ Listas": "✅ 就绪",
    "⚠️ Con avisos": "⚠️ 有警告",
    "❌ Con ingredientes sin resolver": "❌ 存在未解决原料",
    "✔ Aprobar seleccionadas": "✔ 批准所选项",
    "✔✔ Aprobar todas las ✅ listas": "✔✔ 批准所有 ✅ 就绪项",
    "Descartar seleccionadas": "舍弃所选项",
    "Receta": "食谱",
    "Categoría / Hoja": "类别 / 表格",
    "Ingred.": "原料",
    "Costo Excel": "Excel 成本",
    "Costo sistema": "系统成本",
    "Acceso Protegido": "受保护受限访问",
    "Ingrese la clave de seguridad para continuar:": "请输入安全密码以继续：",
    "❌ Clave incorrecta": "❌ 密码错误",
    "NOMBRE DEL INSUMO": "原料名称",
    "Gestión de Insumo, Precios, Histórico y Eliminación": "原料管理、价格、历史记录与删除",
    "✏️ EDITAR INFORMACIÓN Y PRECIOS": "✏️ 编辑信息与价格",
    "Nombre / Descripción del Insumo": "原料名称 / 描述",
    "Unidad de Medida": "计量单位",
    "Unidades (und)": "单位 (und)",
    "Gramos (g / gr / grs)": "克 (g / gr / grs)",
    "Paquete (pq)": "包装 (pq)",
    "Centímetro Cúbico (cc)": "立方厘米 (cc)",
    "Precio de Costo Visual ($)": "视觉成本价 ($)",
    "Precio Venta (Usado para Cálculos) ($)": "售价（用于计算）($)",
    "💾 Guardar Cambios y Registrar Histórico": "💾 保存更改并记录历史",
    "📜 HISTÓRICO DE FECHAS Y PRECIOS ANTERIORMENTE REGISTRADOS": "📜 历史已登记日期与价格",
    "Fecha y Hora": "日期与时间",
    "Costo: anterior → nuevo": "成本：旧 → 新",
    "Venta: anterior → nuevo": "售价：旧 → 新",
    "Motivo": "原因",
    "🗑 Eliminar Insumo del Sistema": "🗑 从系统中删除原料",
    "GALERÍA HIPERMARKET": "GALERÍA HIPERMARKET",
    "Departamento de Costos y Producción": "成本与生产部门",
    "Ficha Técnica de Producción": "生产技术档案",
    "Fecha: --/--/----": "日期：--/--/----",
    "CATEGORÍA": "类别",
    "RENDIMIENTO": "产量/效率",
    "COSTO UNITARIO": "单位成本",
    "PVP SUGERIDO": "建议零售价",
    "COMPOSICIÓN DE INGREDIENTES / SUB-RECETAS": "原料组成 / 子配方",
    "Costo Total ($)": "总成本 ($)",
    "🖨 Imprimir Ficha": "🖨 打印档案",
    "📝 Motivo del cambio de precio": "📝 价格变更原因",
    "Escribe el motivo (mínimo 3 caracteres) para continuar.": "请填写原因（至少3个字符）以继续。",
    "Guardar cambio": "保存变更",
    "➕ Agregar Nuevo Insumo Primario": "➕ 添加新基础原料",
    "Código del Insumo": "原料代码",
    "Kilogramo (KG)": "千克 (KG)",
    "Gramo (GR)": "克 (GR)",
    "Litro (LT)": "升 (LT)",
    "Mililitro (ML)": "毫升 (ML)",
    "Unidad (UND)": "单位 (UND)",
    "Paquete (PAQ)": "包装 (PAQ)",
    "Centímetro Cúbico (CC)": "立方厘米 (CC)",
    "Nombre / Descripción": "名称 / 描述",
    "Costo Venta ($)": "销售成本 ($)",
    "+ Guardar Insumo": "+ 保存原料",
    "Jefferson": "Jefferson",
    "jeffercvc@hipermarket.com": "jeffercvc@hipermarket.com",

    // ---- Auditoría ----
    "Auditoría - Hipergalerias": "审计 - Hipergalerias",
    "Verificando permisos…": "正在验证权限……",
    "Auditoría del sistema": "系统审计",
    "Últimos 7 días": "近7天",
    "Críticos y avisos sin revisar": "未审核的严重事件和需关注事项",
    "Filtrar pendientes": "筛选待审核",
    "Módulo": "模块",
    "Qué se modificó": "修改的内容",
    "Importancia": "重要程度",
    "Usuario o dato": "用户或数据",
    "usuario, cédula, código…": "用户、身份证号、编码……",
    "Descuentos": "员工折扣",
    "Recetario": "配方与成本",
    "Creación": "创建",
    "Modificación": "修改",
    "Eliminación": "删除",
    "Evento": "事件",
    "Crítico": "严重",
    "Atención": "需关注",
    "Normal": "正常",
    "Solo pendientes de revisar": "仅显示待审核",
    "Buscar": "搜索",
    "Limpiar": "清除",
    "Exportar a Excel": "导出到 Excel",
    "Cuándo": "时间",
    "Quién": "用户",
    "Dónde": "位置",
    "Qué pasó": "内容",
    "Revisión": "审核",
    "Creó": "创建",
    "Modificó": "修改",
    "Eliminó": "删除",
    "Pendiente": "待审核",
    "Cargando…": "加载中……",
    "Sin resultados": "没有结果",
    "Ajusta los filtros o el rango de fechas.": "请调整筛选条件或日期范围。",
    "eventos": "条事件",
    "Recepción y vencimientos": "收货与保质期",
    "Descuentos a empleados": "员工折扣",
    "Insumos": "原料",
    "Eventos del sistema": "系统事件",
    "Todo": "全部",
    "Costo de venta": "销售成本",
    "Costo": "成本",
    "Precio": "价格",
    "Historial de cambios": "变更历史",
    "Inhabilitado": "已停用",
    "Nombre": "名称",
    "Fecha de vencimiento": "保质期",
    "Fecha": "日期",
    "Costo nuevo": "新成本",
    "Costo de venta nuevo": "新销售成本",
    "Monto": "金额",
    "Nombre del empleado": "员工姓名",
    "Nombre y apellido": "姓名",
    "Código": "编码",
    "Total deuda": "欠款总额",
    "Monto abonado": "已还金额",
    "Costo unitario": "单位成本",
    "Costo total": "总成本",
    "Cargo": "职位",
    "Tipo": "类型",
    "Fecha recepcion": "收货日期",
    "Fecha vencimiento": "保质期",
    "Cod barra": "条形码",
    "Cod interno": "内部编码",
    "Num factura": "发票号",
    "Persona recibe": "收货人",
    "Costo venta": "销售成本",
    "Es subreceta": "是否子配方",
    "Merma kg": "损耗(公斤)",
    "Rendimiento": "产量",
    "Piezas": "件数",
    "Pvp": "建议零售价",
    "Costo batch": "批次成本",
    "Cod": "编码",
    "¿Qué cambió?": "变更内容",
    "Datos que se eliminaron": "被删除的数据",
    "Datos registrados": "已登记的数据",
    "No se indicó el motivo de este cambio": "未说明此次变更的原因",
    "Detalles técnicos": "技术详情",
    "Ver todo el historial de este registro": "查看此记录的完整历史",
    "Marcar como revisado": "标记为已审核",
    "Se agregó:": "新增：",
    "Se modificaron entradas anteriores": "已修改以前的记录",
    "(vacío)": "（空）",
    "Sí": "是",
    "No": "否",
    "No hay eventos con este filtro.": "当前筛选条件下没有事件。",
    "Idioma / 语言": "Idioma / 语言",
    "Correo": "邮箱",
    "Elemento": "对象",
    "Campos cambiados": "修改字段",
    "Antes": "变更前",
    "Después": "变更后",
    "Revisado": "已审核",
    "Bienvenido,": "欢迎，",
    "Bienvenido": "欢迎"
  };

  // Textos con datos variables: [expresión, función que arma la traducción]
  const PATRONES = [
    [/^(\d+) prod\.$/, m => m[1] + ' 项'],
    [/^Descontar \((\d+)\)$/, m => '扣款 (' + m[1] + ')'],
    [/^\(Cód: (.*) \| Cant: (.*)\)$/, m => '（编码：' + m[1] + ' | 数量：' + m[2] + '）'],
    [/^Empleados: (\d+)\s+·\s+Unidades: (\d+)$/, m => '员工：' + m[1] + ' · 数量：' + m[2]],
    [/^(\d{2}\/\d{2}\/\d{4}) al (\d{2}\/\d{2}\/\d{4})$/, m => m[1] + ' 至 ' + m[2]],
    [/^No se pudo leer de Supabase: (.*)\. Se muestran los datos guardados en este equipo\.$/, m => '无法从 Supabase 读取：' + m[1] + '。当前显示本机保存的数据。'],
    [/^Deuda asignada: (\d+) producto\(s\) · \$(.*)$/, m => '欠款已登记：' + m[1] + ' 件商品 · $' + m[2]],
    [/^"(.*)": el total debe ser mayor a \$0\. Ingresa su precio base\.$/, m => '"' + m[1] + '"：合计必须大于 $0，请输入其基础价格。'],
    [/^No se encontró ningún artículo con "(.*)"\. Regístralo en la pestaña Artículos\.$/, m => '未找到商品"' + m[1] + '"。请在"商品"标签页中登记。'],
    [/^¿Seguro de eliminar a (.*)\?$/, m => '确定要删除 ' + m[1] + ' 吗？'],
    [/^No hay deudas asignadas el (.*)$/, m => m[1] + ' 没有已分配的欠款'],
    [/^No hay deudas asignadas entre el (.*) y el (.*)$/, m => m[1] + ' 至 ' + m[2] + ' 之间没有已分配的欠款'],
    [/^Descuento revertido: \$(.*)$/, m => '扣款已撤销：$' + m[1]],
    [/^Error buscando artículos?: (.*)$/, m => '搜索商品出错：' + m[1]],
    [/^No se pudieron cargar los artículos: (.*)$/, m => '无法加载商品：' + m[1]],
    [/^No se pudo guardar la tanda: (.*)$/, m => '无法保存本批记录：' + m[1]],
    [/^No se pudo registrar el empleado: (.*)$/, m => '无法登记员工：' + m[1]],
    [/^No se pudo eliminar el empleado: (.*)$/, m => '无法删除员工：' + m[1]],
    [/^No se pudo registrar el artículo: (.*)$/, m => '无法登记商品：' + m[1]],
    [/^No se pudo eliminar el registro: (.*)$/, m => '无法删除记录：' + m[1]],
    [/^No se pudo eliminar la cuenta: (.*)$/, m => '无法删除账户：' + m[1]],
    [/^No se pudo guardar el descuento: (.*)$/, m => '无法保存扣款：' + m[1]],
    [/^No se pudo revertir: (.*)$/, m => '无法撤销：' + m[1]],

    // Patrones dinámicos para tablas y conteos
    [/^Mostrando (\d+) - (\d+) de (\d+) insumos$/, m => '显示 ' + m[1] + ' - ' + m[2] + ' 条原料（共 ' + m[3] + ' 条）'],
    [/^Mostrando (\d+) - (\d+) de (\d+) recetas$/, m => '显示 ' + m[1] + ' - ' + m[2] + ' 条食谱（共 ' + m[3] + ' 条）'],
    [/^Página (\d+) de (\d+)$/, m => '第 ' + m[1] + ' 页，共 ' + m[2] + ' 页'],
    [/^✅ (\d+) listas · ⚠️ (\d+) con avisos · ❌ (\d+) bloqueadas$/, m => '✅ ' + m[1] + ' 就绪 · ⚠️ ' + m[2] + ' 有警告 · ❌ ' + m[3] + ' 已受阻'],

    // ---- Auditoría ----
    [/^· cambió (.*)$/, m => '· 修改了：' + m[1].split(', ').map(x => tr(x.charAt(0).toUpperCase() + x.slice(1))).join('、')],
    [/^(.*?) (creó|modificó|eliminó) (un registro de recepción|un descuento de empleado|un empleado|un artículo|un insumo|una receta|un evento|un registro)$/,
      m => m[1] + ' ' + ({ 'creó': '创建了', 'modificó': '修改了', 'eliminó': '删除了' })[m[2]] + { 'un registro de recepción': '一条收货记录', 'un descuento de empleado': '一笔员工折扣', 'un empleado': '一名员工', 'un artículo': '一个商品', 'un insumo': '一种原料', 'una receta': '一份配方', 'un evento': '一个事件', 'un registro': '一条记录' }[m[3]]],
    [/^(.*?) registró: (.*)$/, m => m[1] + ' 记录了：' + tr(m[2])],
    [/^Exportación:? Excel de auditoría \((\d+) filas\)$/, m => '导出：审计 Excel（' + m[1] + ' 行）'],
    [/^Motivo: (.*)$/, m => '原因：' + m[1]],
    [/^Dispositivo: (.*) · IP: (.*)$/, m => '设备：' + m[1].replace(/^(.+) en (Windows|Android|iOS|Mac|Linux)$/, '$2 上的 $1').replace(/^Navegador$/, '浏览器') + ' · IP：' + (m[2] === 'no disponible' ? '不可用' : m[2])],
    [/^Correo: (.*)$/, m => '邮箱：' + m[1]],
    [/^Registro: (.*) #(.*)$/, m => '记录：' + m[1] + ' #' + m[2]],
    [/^Revisado por (.*) · (.*)$/, m => '审核人：' + m[1] + ' · ' + m[2]],
    [/^de (\d+)$/, m => '/ ' + m[1] + ' 页'],
    [/^No se pudo leer la auditoría: (.*)$/, m => '无法读取审计记录：' + m[1]],
    [/^No se pudo marcar: (.*)$/, m => '无法标记：' + m[1]]
  ];

  const SKIP = 'script,style,textarea,code,[data-no-i18n]';
  const DATOS = 'tbody,.ac,.items,.uname,#umNombre,#umEmail';
  const ATTRS = ['placeholder', 'title', 'aria-label'];
  const textos = new WeakMap(), attrs = new WeakMap(), faltantes = new Set();
  let lang = 'es';
  try { lang = localStorage.getItem(KEY) === 'zh' ? 'zh' : 'es'; } catch (e) { }

  function buscar(c) {
    if (Object.prototype.hasOwnProperty.call(ES2ZH, c)) return ES2ZH[c];
    for (const [re, fn] of PATRONES) { const m = c.match(re); if (m) return fn(m); }
    return null;
  }

  // Traduce un texto en español; conserva espacios y símbolos/emoji de los extremos
  function tr(s) {
    if (lang !== 'zh') return s;
    const core = s.trim().replace(/\s+/g, ' ');
    if (!core) return s;
    const lead = s.slice(0, s.length - s.trimStart().length), tail = s.slice(s.trimEnd().length);
    let r = buscar(core);
    if (r !== null) return lead + r + tail;
    const m = core.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/su);
    if (m && m[2]) {
      r = buscar(core.slice(m[1].length));
      if (r !== null) return lead + m[1] + r + tail;
      r = buscar(m[2]);
      if (r !== null) return lead + m[1] + r + m[3] + tail;
    }
    return s;
  }

  function recoger(el, es) {
    const t = es.trim();
    if (/\p{L}{3,}/u.test(t) && !/[\u4e00-\u9fff]/.test(t) && !(el && el.closest && el.closest(DATOS))) faltantes.add(t.replace(/\s+/g, ' '));
  }

  function nodoTexto(n) {
    const v = n.nodeValue, st = textos.get(n);
    const es = (st && v === st.zh) ? st.es : v;
    if (lang === 'zh') {
      if (!/\S/.test(es)) return;
      const z = tr(es);
      if (z !== es) { textos.set(n, { es: es, zh: z }); if (v !== z) n.nodeValue = z; }
      else { if (st) textos.delete(n); recoger(n.parentElement, es); }
    } else if (st && v === st.zh) { n.nodeValue = st.es; textos.delete(n); }
  }

  function elAttrs(el) {
    const reg = attrs.get(el) || {};
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const v = el.getAttribute(a), st = reg[a];
      const es = (st && v === st.zh) ? st.es : v;
      if (lang === 'zh') {
        const z = tr(es);
        if (z !== es) { reg[a] = { es: es, zh: z }; if (v !== z) el.setAttribute(a, z); }
        else { delete reg[a]; recoger(el, es); }
      } else if (st && v === st.zh) { el.setAttribute(a, st.es); delete reg[a]; }
    }
    attrs.set(el, reg);
  }

  function recorrer(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (!root.parentElement || !root.parentElement.closest(SKIP)) nodoTexto(root); return; }
    if (root.nodeType !== 1 || root.closest(SKIP)) return;
    elAttrs(root);
    root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(e => { if (!e.closest(SKIP)) elAttrs(e); });
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), lista = [];
    let n; while ((n = w.nextNode())) lista.push(n);
    lista.forEach(t => { if (!t.parentElement || !t.parentElement.closest(SKIP)) nodoTexto(t); });
  }

  function aplicar() {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'es';
    recorrer(document.querySelector('title'));
    recorrer(document.body);
    document.querySelectorAll('.lang-btn b').forEach(b => { b.textContent = lang === 'zh' ? 'Español' : '中文'; });
  }

  // Los avisos tipo alert/confirm/prompt también salen en el idioma elegido
  ['alert', 'confirm', 'prompt'].forEach(f => {
    const o = window[f].bind(window);
    window[f] = (msg, ...r) => o(tr(String(msg == null ? '' : msg)), ...r);
  });

  // Traduce lo que la página genere después (tablas, avisos, ventanas)
  new MutationObserver(ms => {
    ms.forEach(m => {
      if (m.type === 'childList') m.addedNodes.forEach(recorrer);
      else if (m.type === 'characterData') recorrer(m.target);
      else if (m.type === 'attributes') elAttrs(m.target);
    });
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });

  window.cambiarIdioma = function () {
    lang = lang === 'zh' ? 'es' : 'zh';
    try { localStorage.setItem(KEY, lang); } catch (e) { }
    faltantes.clear();
    aplicar();
  };
  window.idiomaActual = () => lang;
  window.i18nTr = s => tr(String(s == null ? '' : s));   // para textos que la página arma fuera del DOM (p. ej. Excel)
  window.i18nFaltantes = function () {
    const l = [...faltantes];
    console.log(l.length ? 'Textos sin traducir (' + l.length + '):\n' + JSON.stringify(l, null, 1) : 'No falta ningún texto en esta pantalla.');
    return l;
  };

  aplicar();
})();