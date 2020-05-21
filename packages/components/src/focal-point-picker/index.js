/**
 * External dependencies
 */
import { noop } from 'lodash';
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { Component, createRef } from '@wordpress/element';
import { withInstanceId, compose } from '@wordpress/compose';
import { UP, DOWN, LEFT, RIGHT } from '@wordpress/keycodes';

/**
 * Internal dependencies
 */
import withFocusOutside from '../higher-order/with-focus-outside';
import BaseControl from '../base-control';
import Controls from './controls';
import FocalPoint from './focal-point';
import Grid from './grid';
import Media from './media';
import {
	MediaWrapper,
	MediaContainer,
} from './styles/focal-point-picker-style';
import { roundClamp } from '../number-control/utils';

export class FocalPointPicker extends Component {
	constructor( props, context ) {
		super( props, context );

		this.state = {
			isDragging: false,
			bounds: {},
			percentages: props.value,
		};

		this.containerRef = createRef();
		this.mediaRef = createRef();

		this.handleOnMouseUp = this.handleOnMouseUp.bind( this );
		this.handleOnKeyDown = this.handleOnKeyDown.bind( this );
		this.onMouseMove = this.onMouseMove.bind( this );

		this.updateBounds = this.updateBounds.bind( this );
		this.updateValue = this.updateValue.bind( this );
	}
	componentDidMount() {
		document.addEventListener( 'mouseup', this.handleOnMouseUp );
		window.addEventListener( 'resize', this.updateBounds );
	}
	componentDidUpdate( prevProps ) {
		if ( prevProps.url !== this.props.url ) {
			this.setState( {
				isDragging: false,
			} );
		}
	}
	componentWillUnmount() {
		document.removeEventListener( 'mouseup', this.handleOnMouseUp );
		window.removeEventListener( 'resize', this.updateBounds );
	}
	calculateBounds() {
		const bounds = {
			top: 0,
			left: 0,
			bottom: 0,
			right: 0,
			width: 0,
			height: 0,
		};

		if ( ! this.mediaRef.current ) {
			return bounds;
		}

		const dimensions = {
			width: this.mediaRef.current.clientWidth,
			height: this.mediaRef.current.clientHeight,
		};
		const pickerDimensions = this.pickerDimensions();

		const widthRatio = pickerDimensions.width / dimensions.width;
		const heightRatio = pickerDimensions.height / dimensions.height;

		if ( heightRatio >= widthRatio ) {
			bounds.width = bounds.right = pickerDimensions.width;
			bounds.height = dimensions.height * widthRatio;
			bounds.top = ( pickerDimensions.height - bounds.height ) / 2;
			bounds.bottom = bounds.top + bounds.height;
		} else {
			bounds.height = bounds.bottom = pickerDimensions.height;
			bounds.width = dimensions.width * heightRatio;
			bounds.left = ( pickerDimensions.width - bounds.width ) / 2;
			bounds.right = bounds.left + bounds.width;
		}
		return bounds;
	}
	updateValue( nextValue = {} ) {
		const { onChange } = this.props;
		const { x, y } = nextValue;

		const nextPercentage = {
			x: parseFloat( x ).toFixed( 2 ),
			y: parseFloat( y ).toFixed( 2 ),
		};

		this.setState( { percentages: nextPercentage }, () => {
			onChange( nextPercentage );
		} );
	}
	updateBounds() {
		this.setState( {
			bounds: this.calculateBounds(),
		} );
	}
	handleOnMouseUp() {
		this.setState( { isDragging: false } );
	}
	handleOnKeyDown( event ) {
		const { keyCode, shiftKey } = event;
		if ( ! [ UP, DOWN, LEFT, RIGHT ].includes( keyCode ) ) return;

		const { x, y } = this.state.percentages;

		event.preventDefault();

		// Normalizing values for incrementing/decrementing based on arrow keys
		let nextX = parseFloat( x ) * 100;
		let nextY = parseFloat( y ) * 100;
		const step = shiftKey ? 10 : 1;

		switch ( event.keyCode ) {
			case UP:
				nextY = nextY - step;
				break;
			case DOWN:
				nextY = nextY + step;
				break;
			case LEFT:
				nextX = nextX - step;
				break;
			case RIGHT:
				nextX = nextX + step;
				break;
		}

		// Transforming values back to 0.00 percentage values
		nextX = roundClamp( nextX, 0, 100, step ) / 100;
		nextY = roundClamp( nextY, 0, 100, step ) / 100;

		const percentages = {
			x: nextX,
			y: nextY,
		};

		this.updateValue( percentages );
	}
	onMouseMove( event ) {
		const { isDragging, bounds } = this.state;

		if ( ! isDragging ) return;

		const pickerDimensions = this.pickerDimensions();
		const cursorPosition = {
			left: event.pageX - pickerDimensions.left,
			top: event.pageY - pickerDimensions.top,
		};

		const left = Math.max(
			bounds.left,
			Math.min( cursorPosition.left, bounds.right )
		);
		const top = Math.max(
			bounds.top,
			Math.min( cursorPosition.top, bounds.bottom )
		);

		const percentages = {
			x:
				( left - bounds.left ) /
				( pickerDimensions.width - bounds.left * 2 ),
			y:
				( top - bounds.top ) /
				( pickerDimensions.height - bounds.top * 2 ),
		};

		this.updateValue( percentages );
	}
	pickerDimensions() {
		const containerNode = this.containerRef.current;

		if ( ! containerNode ) {
			return {
				width: 0,
				height: 0,
				left: 0,
				top: 0,
			};
		}

		const { clientHeight, clientWidth } = containerNode;
		const { top, left } = containerNode.getBoundingClientRect();

		return {
			width: clientWidth,
			height: clientHeight,
			top: top + document.body.scrollTop,
			left,
		};
	}
	iconCoordinates() {
		const { value } = this.props;
		const { bounds } = this.state;
		const pickerDimensions = this.pickerDimensions();

		const iconCoordinates = {
			left:
				value.x * ( pickerDimensions.width - bounds.left * 2 ) +
				bounds.left,
			top:
				value.y * ( pickerDimensions.height - bounds.top * 2 ) +
				bounds.top,
		};

		return iconCoordinates;
	}
	// Callback method for the withFocusOutside higher-order component
	handleFocusOutside() {
		this.setState( {
			isDragging: false,
		} );
	}
	render() {
		const {
			autoPlay,
			instanceId,
			url,
			label,
			help,
			className,
		} = this.props;
		const { bounds, isDragging, percentages } = this.state;
		const iconCoordinates = this.iconCoordinates();

		const classes = classnames(
			'components-focal-point-picker-control',
			className
		);

		const id = `inspector-focal-point-picker-control-${ instanceId }`;

		return (
			<BaseControl
				label={ label }
				id={ id }
				help={ help }
				className={ classes }
			>
				<MediaWrapper className="components-focal-point-picker-wrapper">
					<MediaContainer
						className="components-focal-point-picker"
						onDragStart={ () =>
							this.setState( { isDragging: true } )
						}
						onDrop={ () => this.setState( { isDragging: false } ) }
						onKeyDown={ this.handleOnKeyDown }
						onMouseDown={ ( event ) => {
							event.persist();
							this.setState( { isDragging: true }, () => {
								this.onMouseMove( event );
							} );
						} }
						onMouseMove={ this.onMouseMove }
						onMouseUp={ this.handleOnMouseUp }
						ref={ this.containerRef }
						role="button"
						tabIndex="-1"
					>
						<Grid bounds={ bounds } percentages={ percentages } />
						<Media
							alt={ __( 'Media preview' ) }
							autoPlay={ autoPlay }
							mediaRef={ this.mediaRef }
							onLoad={ this.updateBounds }
							src={ url }
						/>
						<FocalPoint
							coordinates={ iconCoordinates }
							isDragging={ isDragging }
						/>
					</MediaContainer>
				</MediaWrapper>
				<Controls
					percentages={ percentages }
					onChange={ this.updateValue }
				/>
			</BaseControl>
		);
	}
}

FocalPointPicker.defaultProps = {
	autoPlay: true,
	onChange: noop,
	value: {
		x: 0.5,
		y: 0.5,
	},
	url: null,
};

export default compose( [ withInstanceId, withFocusOutside ] )(
	FocalPointPicker
);
